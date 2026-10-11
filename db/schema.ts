import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const members = sqliteTable('members', {
 sections:text('sections'),allCompanies:integer('all_companies').notNull().default(0),companyIds:text('company_ids').notNull().default('[]'),
 id:text('id').primaryKey(), userId:text('user_id'), email:text('email').notNull(), name:text('name').notNull(),
 role:text('role',{enum:['Admin','Manager','Designer','Staff']}).notNull(), active:integer('active').notNull().default(1), createdAt:text('created_at').notNull()
},t=>[uniqueIndex('member_email').on(t.email),uniqueIndex('member_user').on(t.userId)]);
export const companies = sqliteTable('companies', {id:text('id').primaryKey(),name:text('name').notNull(),color:text('color').notNull().default('#7951d3'),driveUrl:text('drive_url').notNull().default(''),active:integer('active').notNull().default(1)},t=>[uniqueIndex('company_name').on(t.name)]);
export const content = sqliteTable('content', {
 id:text('id').primaryKey(), companyId:text('company_id').notNull().references(()=>companies.id), title:text('title').notNull(), publishDate:text('publish_date').notNull(), publishTime:text('publish_time').notNull().default(''),
 type:text('type').notNull().default('Single Post'),platform:text('platform').notNull().default('Instagram'),status:text('status').notNull().default('Planned'),designStatus:text('design_status').notNull().default('Pending'),
 creatorId:text('creator_id').references(()=>members.id),priority:text('priority').notNull().default('Medium'),notes:text('notes').notNull().default(''),driveUrl:text('drive_url').notNull().default(''),sourceKey:text('source_key'),
 version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),updatedBy:text('updated_by').notNull().references(()=>members.id)
},t=>[uniqueIndex('content_source').on(t.sourceKey),index('content_date').on(t.publishDate),index('content_creator').on(t.creatorId)]);
export const tasks = sqliteTable('tasks', {
 id:text('id').primaryKey(),title:text('title').notNull(),dueDate:text('due_date').notNull(),assigneeId:text('assignee_id').references(()=>members.id),status:text('status').notNull().default('Pending'),priority:text('priority').notNull().default('Medium'),notes:text('notes').notNull().default(''),sourceKey:text('source_key'),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull(),updatedBy:text('updated_by').notNull().references(()=>members.id)
},t=>[uniqueIndex('task_source').on(t.sourceKey)]);
export const activity = sqliteTable('activity', {id:integer('id').primaryKey({autoIncrement:true}),actorId:text('actor_id').notNull(),entityType:text('entity_type').notNull(),entityId:text('entity_id').notNull(),action:text('action').notNull(),detail:text('detail').notNull(),createdAt:text('created_at').notNull()});
