-- CreateTable
CREATE TABLE `iiko_access_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `company_id` VARCHAR(36) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `is_expired` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `iiko_access_tokens` ADD CONSTRAINT `iiko_access_tokens_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
