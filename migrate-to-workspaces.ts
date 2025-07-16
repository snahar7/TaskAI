import { db } from "./server/db";
import { users, workspaces, workspaceMemberships, goals, projects, tasks, subtasks } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Migration script to transition from team-based to workspace-based multi-tenant architecture
 * This script:
 * 1. Creates personal workspaces for each unique team
 * 2. Creates workspace memberships for all team members
 * 3. Updates all entities to reference the new workspace
 */

async function migrateToWorkspaces() {
  console.log("Starting migration to workspace-based multi-tenant architecture...");

  try {
    // Step 1: Get all unique team IDs from users
    const allUsers = await db.select().from(users);
    const uniqueTeamIds = [...new Set(allUsers.filter(u => u.teamId).map(u => u.teamId))];
    
    console.log(`Found ${uniqueTeamIds.length} unique teams to migrate`);

    // Map to store teamId -> workspaceId mapping
    const teamToWorkspaceMap = new Map<number, number>();

    // Step 2: Create workspaces for each team
    for (const teamId of uniqueTeamIds) {
      // Find the first user of this team to be the owner
      const teamUsers = allUsers.filter(u => u.teamId === teamId);
      const owner = teamUsers[0];
      
      if (!owner) continue;

      // Create workspace
      const result = await db.execute(sql`
        INSERT INTO workspaces (name, description, created_by, settings)
        VALUES (${`Team ${teamId} Workspace`}, ${`Migrated from team ${teamId}`}, ${owner.id}, ${JSON.stringify({ isPersonal: teamUsers.length === 1 })})
        RETURNING *
      `);
      const workspace = result.rows[0];

      console.log(`Created workspace ${workspace.id} for team ${teamId}`);
      teamToWorkspaceMap.set(teamId!, workspace.id);

      // Step 3: Create workspace memberships for all team members
      for (const user of teamUsers) {
        await db.insert(workspaceMemberships).values({
          userId: user.id,
          workspaceId: workspace.id,
          role: user.id === owner.id ? 'owner' : 'member',
        });
        console.log(`  - Added user ${user.email} to workspace`);
      }
    }

    // Step 4: Update all goals with workspace IDs
    console.log("\nUpdating goals with workspace IDs...");
    const allGoals = await db.select().from(goals);
    for (const goal of allGoals) {
      if (goal.assignedTo) {
        const user = allUsers.find(u => u.id === goal.assignedTo);
        if (user?.teamId) {
          const workspaceId = teamToWorkspaceMap.get(user.teamId);
          if (workspaceId) {
            await db.update(goals)
              .set({ 
                workspaceId
              })
              .where(eq(goals.id, goal.id));
          }
        }
      }
    }

    // Step 5: Update all projects with workspace IDs
    console.log("Updating projects with workspace IDs...");
    const allProjects = await db.select().from(projects);
    for (const project of allProjects) {
      if (project.assignedTo) {
        const user = allUsers.find(u => u.id === project.assignedTo);
        if (user?.teamId) {
          const workspaceId = teamToWorkspaceMap.get(user.teamId);
          if (workspaceId) {
            await db.update(projects)
              .set({ 
                workspaceId
              })
              .where(eq(projects.id, project.id));
          }
        }
      }
    }

    // Step 6: Update all tasks with workspace IDs
    console.log("Updating tasks with workspace IDs...");
    const allTasks = await db.select().from(tasks);
    for (const task of allTasks) {
      if (task.assignedTo) {
        const user = allUsers.find(u => u.id === task.assignedTo);
        if (user?.teamId) {
          const workspaceId = teamToWorkspaceMap.get(user.teamId);
          if (workspaceId) {
            await db.update(tasks)
              .set({ 
                workspaceId
              })
              .where(eq(tasks.id, task.id));
          }
        }
      }
    }

    // Step 7: Update all subtasks with workspace IDs
    console.log("Updating subtasks with workspace IDs...");
    const allSubtasks = await db.select().from(subtasks);
    for (const subtask of allSubtasks) {
      if (subtask.assignedTo) {
        const user = allUsers.find(u => u.id === subtask.assignedTo);
        if (user?.teamId) {
          const workspaceId = teamToWorkspaceMap.get(user.teamId);
          if (workspaceId) {
            await db.update(subtasks)
              .set({ 
                workspaceId
              })
              .where(eq(subtasks.id, subtask.id));
          }
        }
      }
    }

    console.log("\nMigration completed successfully!");
    console.log(`- Created ${teamToWorkspaceMap.size} workspaces`);
    console.log("- Updated all entities with workspace IDs");
    console.log("- Created workspace memberships for all users");

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration
migrateToWorkspaces()
  .then(() => {
    console.log("Migration finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration error:", error);
    process.exit(1);
  });