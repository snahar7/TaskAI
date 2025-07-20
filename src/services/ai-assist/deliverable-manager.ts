import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface ManagedDeliverable {
  id: string;
  taskId: number;
  type: 'document' | 'code' | 'plan' | 'research' | 'analysis';
  title: string;
  content: string;
  filename: string;
  filePath?: string;
  createdAt: Date;
  size: number;
}

export class DeliverableManager {
  private deliverables: Map<string, ManagedDeliverable> = new Map();
  private baseOutputPath: string;

  constructor() {
    // Set up output directory for deliverables
    this.baseOutputPath = join(process.cwd(), 'ai-assist-outputs');
    this.ensureOutputDirectory();
  }

  /**
   * Save deliverable content to file system and track it
   */
  async saveDeliverable(
    taskId: number,
    type: ManagedDeliverable['type'],
    title: string,
    content: string,
    suggestedFilename?: string
  ): Promise<ManagedDeliverable> {
    const id = this.generateDeliverableId(taskId, type);
    const filename = suggestedFilename || this.generateFilename(type, title);
    const filePath = join(this.baseOutputPath, `task_${taskId}`, filename);
    
    // Ensure task directory exists
    const taskDir = join(this.baseOutputPath, `task_${taskId}`);
    if (!existsSync(taskDir)) {
      mkdirSync(taskDir, { recursive: true });
    }

    // Save content to file
    try {
      writeFileSync(filePath, content, 'utf8');
    } catch (error) {
      console.warn('Failed to save deliverable to file system:', error);
      // Continue without file system storage
    }

    const deliverable: ManagedDeliverable = {
      id,
      taskId,
      type,
      title,
      content,
      filename,
      filePath: existsSync(filePath) ? filePath : undefined,
      createdAt: new Date(),
      size: Buffer.byteLength(content, 'utf8')
    };

    this.deliverables.set(id, deliverable);
    return deliverable;
  }

  /**
   * Get all deliverables for a specific task
   */
  getDeliverablesForTask(taskId: number): ManagedDeliverable[] {
    return Array.from(this.deliverables.values())
      .filter(d => d.taskId === taskId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get specific deliverable by ID
   */
  getDeliverable(id: string): ManagedDeliverable | undefined {
    return this.deliverables.get(id);
  }

  /**
   * Get deliverable content (from memory or file)
   */
  getDeliverableContent(id: string): string | null {
    const deliverable = this.deliverables.get(id);
    if (!deliverable) return null;

    // Return content from memory
    return deliverable.content;
  }

  /**
   * Delete deliverable and its file
   */
  deleteDeliverable(id: string): boolean {
    const deliverable = this.deliverables.get(id);
    if (!deliverable) return false;

    // Delete file if it exists
    if (deliverable.filePath && existsSync(deliverable.filePath)) {
      try {
        const fs = require('fs');
        fs.unlinkSync(deliverable.filePath);
      } catch (error) {
        console.warn('Failed to delete deliverable file:', error);
      }
    }

    return this.deliverables.delete(id);
  }

  /**
   * Get summary statistics
   */
  getDeliverableStats(): {
    totalCount: number;
    totalSize: number;
    typeBreakdown: Record<string, number>;
    recentActivity: number;
  } {
    const all = Array.from(this.deliverables.values());
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return {
      totalCount: all.length,
      totalSize: all.reduce((sum, d) => sum + d.size, 0),
      typeBreakdown: all.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentActivity: all.filter(d => d.createdAt > oneHourAgo).length
    };
  }

  /**
   * Clean up old deliverables (older than specified days)
   */
  cleanupOldDeliverables(olderThanDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const toDelete = Array.from(this.deliverables.entries())
      .filter(([, deliverable]) => deliverable.createdAt < cutoffDate);

    toDelete.forEach(([id]) => this.deleteDeliverable(id));

    return toDelete.length;
  }

  /**
   * Export deliverables for a task as a summary
   */
  exportTaskSummary(taskId: number): {
    taskId: number;
    deliverableCount: number;
    totalSize: number;
    deliverables: Array<{
      id: string;
      type: string;
      title: string;
      filename: string;
      createdAt: string;
      size: number;
      preview: string;
    }>;
  } {
    const taskDeliverables = this.getDeliverablesForTask(taskId);

    return {
      taskId,
      deliverableCount: taskDeliverables.length,
      totalSize: taskDeliverables.reduce((sum, d) => sum + d.size, 0),
      deliverables: taskDeliverables.map(d => ({
        id: d.id,
        type: d.type,
        title: d.title,
        filename: d.filename,
        createdAt: d.createdAt.toISOString(),
        size: d.size,
        preview: d.content.substring(0, 200) + (d.content.length > 200 ? '...' : '')
      }))
    };
  }

  private generateDeliverableId(taskId: number, type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${taskId}_${type}_${timestamp}_${random}`;
  }

  private generateFilename(type: string, title: string): string {
    const cleanTitle = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    const extension = this.getFileExtension(type);
    return `${type}_${cleanTitle}_${timestamp}${extension}`;
  }

  private getFileExtension(type: string): string {
    switch (type) {
      case 'code':
        return '.js';
      case 'plan':
        return '.md';
      case 'research':
      case 'analysis':
      case 'document':
      default:
        return '.txt';
    }
  }

  private ensureOutputDirectory(): void {
    try {
      if (!existsSync(this.baseOutputPath)) {
        mkdirSync(this.baseOutputPath, { recursive: true });
      }
    } catch (error) {
      console.warn('Failed to create AI assist output directory:', error);
      // Continue without file system storage
    }
  }
}