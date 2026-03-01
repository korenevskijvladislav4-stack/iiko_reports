-- AlterTable
ALTER TABLE `Department` ADD COLUMN `product_group_values` JSON NULL;

-- CreateTable
CREATE TABLE `company_product_groups` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `host_key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(255) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_product_groups_company_id_host_key_value_key`(`company_id`, `host_key`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_points` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `host_key` VARCHAR(191) NOT NULL,
    `point_name` VARCHAR(255) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_points_company_id_host_key_point_name_key`(`company_id`, `host_key`, `point_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_point_department` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `host_key` VARCHAR(191) NOT NULL,
    `point_name` VARCHAR(255) NOT NULL,
    `department_id` VARCHAR(36) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_point_department_company_id_host_key_point_name_key`(`company_id`, `host_key`, `point_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_product_groups` ADD CONSTRAINT `company_product_groups_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_points` ADD CONSTRAINT `company_points_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_point_department` ADD CONSTRAINT `company_point_department_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_point_department` ADD CONSTRAINT `company_point_department_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
