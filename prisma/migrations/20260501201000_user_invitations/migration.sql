-- Add login usernames and invitation-based password setup.
ALTER TABLE `users`
  ADD COLUMN `username` VARCHAR(80) NULL AFTER `email`,
  MODIFY COLUMN `passwordHash` VARCHAR(191) NULL;

UPDATE `users`
SET `username` = LOWER(SUBSTRING_INDEX(`email`, '@', 1))
WHERE `username` IS NULL;

ALTER TABLE `users`
  MODIFY COLUMN `username` VARCHAR(80) NOT NULL;

CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);

CREATE TABLE `user_invitations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(80) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_invitations_email_idx`(`email`),
    INDEX `user_invitations_expiresAt_idx`(`expiresAt`),
    INDEX `user_invitations_createdById_idx`(`createdById`),
    UNIQUE INDEX `user_invitations_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_invitations`
  ADD CONSTRAINT `user_invitations_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
