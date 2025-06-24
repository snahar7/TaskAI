import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Task, Subtask, TaskWithSubtasks } from '@shared/schema';

// Initialize Firebase Admin only if credentials are properly configured
let db: any = null;

if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_ADMIN_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (serviceAccountKey && projectId) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      
      if (serviceAccount.project_id || serviceAccount.projectId) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        db = getFirestore();
        console.log('Firebase initialized successfully');
      } else {
        console.log('Firebase service account missing project_id, using fallback storage');
      }
    } else {
      console.log('Firebase credentials not provided, using fallback storage');
    }
  } catch (error) {
    console.log('Firebase initialization failed, using fallback storage:', error.message);
  }
}

export class FirebaseService {
  async saveTask(task: Omit<Task, 'id'>, subtasks: Omit<Subtask, 'id' | 'taskId'>[]): Promise<TaskWithSubtasks> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Save main task
      const taskRef = await db.collection('tasks').add({
        ...task,
        createdAt: new Date(),
      });

      // Save subtasks with task reference
      const subtaskPromises = subtasks.map(async (subtask) => {
        const subtaskRef = await db.collection('subtasks').add({
          ...subtask,
          taskId: taskRef.id,
          createdAt: new Date(),
        });
        return {
          id: subtaskRef.id,
          taskId: taskRef.id,
          ...subtask,
          completed: false,
          completedAt: null,
          createdAt: new Date(),
        } as Subtask;
      });

      const savedSubtasks = await Promise.all(subtaskPromises);

      return {
        id: taskRef.id,
        ...task,
        createdAt: new Date(),
        subtasks: savedSubtasks,
      } as TaskWithSubtasks;
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      throw new Error('Failed to save task to database');
    }
  }

  async getAllTasks(): Promise<TaskWithSubtasks[]> {
    try {
      const tasksSnapshot = await db.collection('tasks').orderBy('createdAt', 'desc').get();
      const tasks: TaskWithSubtasks[] = [];

      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = { id: taskDoc.id, ...taskDoc.data() } as Task;
        
        // Get subtasks for this task
        const subtasksSnapshot = await db
          .collection('subtasks')
          .where('taskId', '==', taskDoc.id)
          .orderBy('createdAt', 'asc')
          .get();
        
        const subtasks = subtasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Subtask[];

        tasks.push({
          ...taskData,
          subtasks
        });
      }

      return tasks;
    } catch (error) {
      console.error('Error fetching tasks from Firebase:', error);
      throw new Error('Failed to fetch tasks from database');
    }
  }

  async getTask(taskId: string): Promise<TaskWithSubtasks | null> {
    try {
      const taskDoc = await db.collection('tasks').doc(taskId).get();
      
      if (!taskDoc.exists) {
        return null;
      }

      const taskData = { id: taskDoc.id, ...taskDoc.data() } as Task;
      
      // Get subtasks for this task
      const subtasksSnapshot = await db
        .collection('subtasks')
        .where('taskId', '==', taskId)
        .orderBy('createdAt', 'asc')
        .get();
      
      const subtasks = subtasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subtask[];

      return {
        ...taskData,
        subtasks
      };
    } catch (error) {
      console.error('Error fetching task from Firebase:', error);
      throw new Error('Failed to fetch task from database');
    }
  }

  async updateSubtaskCompletion(subtaskId: string, completed: boolean): Promise<void> {
    try {
      const updateData: any = { completed };
      if (completed) {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }

      await db.collection('subtasks').doc(subtaskId).update(updateData);
    } catch (error) {
      console.error('Error updating subtask completion:', error);
      throw new Error('Failed to update subtask completion');
    }
  }
}

export const firebaseService = new FirebaseService();
