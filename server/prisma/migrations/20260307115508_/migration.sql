/*
  Warnings:

  - You are about to drop the `company_point_department` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `company_point_department` DROP FOREIGN KEY `company_point_department_company_id_fkey`;

-- DropForeignKey
ALTER TABLE `company_point_department` DROP FOREIGN KEY `company_point_department_department_id_fkey`;

-- AlterTable
ALTER TABLE `company_points` ADD COLUMN `department_id` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `company_point_department`;

-- CreateTable
CREATE TABLE `company_products` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `host_key` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `group_name` VARCHAR(255) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_products_company_id_host_key_product_id_key`(`company_id`, `host_key`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_products` ADD CONSTRAINT `company_products_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
