/**
 * Initial database schema migration for Studio Booking Assistant
 */
exports.up = function(knex) {
  return Promise.all([
    // Users table
    knex.schema.createTable('users', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('email').notNullable().unique();
      table.string('password').notNullable();
      table.string('phone').nullable();
      table.enum('user_type', ['studio_owner', 'musician', 'staff']).notNullable();
      table.string('reset_password_token').nullable();
      table.timestamp('reset_password_expires').nullable();
      table.timestamps(true, true);
    }),

    // Studios table
    knex.schema.createTable('studios', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('name').notNullable();
      table.text('description').nullable();
      table.string('address').notNullable();
      table.jsonb('contact_info').nullable();
      table.jsonb('working_hours').nullable();
      table.text('cancellation_policy').nullable();
      table.timestamps(true, true);
    }),

    // Rooms table
    knex.schema.createTable('rooms', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('studio_id').references('id').inTable('studios').onDelete('CASCADE');
      table.string('name').notNullable();
      table.text('description').nullable();
      table.integer('capacity').nullable();
      table.decimal('hourly_rate', 10, 2).notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    }),

    // Equipment table
    knex.schema.createTable('equipment', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('studio_id').references('id').inTable('studios').onDelete('CASCADE');
      table.string('name').notNullable();
      table.text('description').nullable();
      table.string('category').nullable();
      table.decimal('daily_rate', 10, 2).nullable();
      table.boolean('is_available').defaultTo(true);
      table.timestamps(true, true);
    }),

    // Staff table
    knex.schema.createTable('staff', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('studio_id').references('id').inTable('studios').onDelete('CASCADE');
      table.string('role').notNullable();
      table.decimal('hourly_rate', 10, 2).nullable();
      table.string('specialization').nullable();
      table.jsonb('availability').nullable();
      table.timestamps(true, true);
    }),

    // Bookings table
    knex.schema.createTable('bookings', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('room_id').references('id').inTable('rooms').onDelete('CASCADE');
      table.uuid('client_id').references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('start_time').notNullable();
      table.timestamp('end_time').notNullable();
      table.enum('status', ['pending', 'confirmed', 'cancelled', 'completed']).defaultTo('pending');
      table.decimal('total_amount', 10, 2).notNullable();
      table.decimal('deposit_amount', 10, 2).nullable();
      table.boolean('deposit_paid').defaultTo(false);
      table.text('notes').nullable();
      table.text('cancellation_reason').nullable();
      table.uuid('cancelled_by').references('id').inTable('users').nullable();
      table.timestamp('cancelled_at').nullable();
      table.timestamps(true, true);
    }),

    // BookingEquipment junction table
    knex.schema.createTable('booking_equipment', function(table) {
      table.uuid('booking_id').references('id').inTable('bookings').onDelete('CASCADE');
      table.uuid('equipment_id').references('id').inTable('equipment').onDelete('CASCADE');
      table.integer('quantity').defaultTo(1);
      table.primary(['booking_id', 'equipment_id']);
    }),

    // BookingStaff junction table
    knex.schema.createTable('booking_staff', function(table) {
      table.uuid('booking_id').references('id').inTable('bookings').onDelete('CASCADE');
      table.uuid('staff_id').references('id').inTable('staff').onDelete('CASCADE');
      table.primary(['booking_id', 'staff_id']);
    }),

    // Payments table
    knex.schema.createTable('payments', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('booking_id').references('id').inTable('bookings').onDelete('CASCADE');
      table.decimal('amount', 10, 2).notNullable();
      table.string('payment_method').notNullable();
      table.string('transaction_id').nullable();
      table.enum('status', ['pending', 'completed', 'failed', 'refunded']).defaultTo('pending');
      table.timestamp('payment_date').defaultTo(knex.fn.now());
      table.timestamps(true, true);
    }),

    // Reviews table
    knex.schema.createTable('reviews', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('booking_id').references('id').inTable('bookings').onDelete('CASCADE');
      table.integer('rating').notNullable();
      table.text('comment').nullable();
      table.timestamps(true, true);
    }),

    // PreparationMaterials table
    knex.schema.createTable('preparation_materials', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('studio_id').references('id').inTable('studios').onDelete('CASCADE');
      table.string('title').notNullable();
      table.string('file_url').nullable();
      table.text('description').nullable();
      table.timestamps(true, true);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    // Drop tables in reverse order to avoid foreign key constraint issues
    knex.schema.dropTableIfExists('preparation_materials'),
    knex.schema.dropTableIfExists('reviews'),
    knex.schema.dropTableIfExists('payments'),
    knex.schema.dropTableIfExists('booking_staff'),
    knex.schema.dropTableIfExists('booking_equipment'),
    knex.schema.dropTableIfExists('bookings'),
    knex.schema.dropTableIfExists('staff'),
    knex.schema.dropTableIfExists('equipment'),
    knex.schema.dropTableIfExists('rooms'),
    knex.schema.dropTableIfExists('studios'),
    knex.schema.dropTableIfExists('users')
  ]);
};