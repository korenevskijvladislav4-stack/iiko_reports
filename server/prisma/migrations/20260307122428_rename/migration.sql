/*
  Warnings:

  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Position` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Department` DROP FOREIGN KEY `Department_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `Position` DROP FOREIGN KEY `Position_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_department_id_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_position_id_fkey`;

-- DropForeignKey
ALTER TABLE `company_delivery_flag_enum` DROP FOREIGN KEY `company_delivery_flag_enum_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `company_iiko_credentials` DROP FOREIGN KEY `company_iiko_credentials_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `company_pay_types` DROP FOREIGN KEY `company_pay_types_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `company_points` DROP FOREIGN KEY `company_points_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `company_product_groups` DROP FOREIGN KEY `company_product_groups_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `company_products` DROP FOREIGN KEY `company_products_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `iiko_access_tokens` DROP FOREIGN KEY `iiko_access_tokens_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_report_filters` DROP FOREIGN KEY `user_report_filters_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_schedules` DROP FOREIGN KEY `user_schedules_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_schedules` DROP FOREIGN KEY `user_schedules_user_id_fkey`;

-- DropTable
DROP TABLE `Company`;

-- DropTable
DROP TABLE `Department`;

-- DropTable
DROP TABLE `Position`;

-- DropTable
DROP TABLE `User`;

-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'staff',
    `schedule_access_role` VARCHAR(50) NOT NULL DEFAULT 'none',
    `include_in_schedule` BOOLEAN NOT NULL DEFAULT false,
    `department_id` VARCHAR(36) NULL,
    `position_id` VARCHAR(36) NULL,
    `hourly_rate` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `product_group_values` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `positions` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_iiko_credentials` ADD CONSTRAINT `company_iiko_credentials_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iiko_access_tokens` ADD CONSTRAINT `iiko_access_tokens_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_report_filters` ADD CONSTRAINT `user_report_filters_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_product_groups` ADD CONSTRAINT `company_product_groups_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_points` ADD CONSTRAINT `company_points_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `positions` ADD CONSTRAINT `positions_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_schedules` ADD CONSTRAINT `user_schedules_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_schedules` ADD CONSTRAINT `user_schedules_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_pay_types` ADD CONSTRAINT `company_pay_types_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_delivery_flag_enum` ADD CONSTRAINT `company_delivery_flag_enum_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_products` ADD CONSTRAINT `company_products_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
