CREATE DATABASE IF NOT EXISTS `cancionero`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `cancionero`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `username` VARCHAR(80) NOT NULL,
  `passwordHash` VARCHAR(191) NULL,
  `role` ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `users_email_key` (`email`),
  UNIQUE INDEX `users_username_key` (`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `song_categories` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(140) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `parentId` INTEGER NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `song_categories_slug_key` (`slug`),
  INDEX `song_categories_parentId_sortOrder_idx` (`parentId`, `sortOrder`),
  PRIMARY KEY (`id`),
  CONSTRAINT `song_categories_parentId_fkey`
    FOREIGN KEY (`parentId`) REFERENCES `song_categories` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `songs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(180) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `hasChords` BOOLEAN NOT NULL DEFAULT TRUE,
  `isPublished` BOOLEAN NOT NULL DEFAULT FALSE,
  `contentVersion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `songs_slug_key` (`slug`),
  INDEX `songs_isPublished_contentVersion_idx` (`isPublished`, `contentVersion`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `song_contents` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `songId` INTEGER NOT NULL,
  `contentJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `song_contents_songId_key` (`songId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `song_contents_songId_fkey`
    FOREIGN KEY (`songId`) REFERENCES `songs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `category_songs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `categoryId` INTEGER NOT NULL,
  `songId` INTEGER NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  INDEX `category_songs_categoryId_sortOrder_idx` (`categoryId`, `sortOrder`),
  INDEX `category_songs_songId_idx` (`songId`),
  UNIQUE INDEX `category_songs_categoryId_songId_key` (`categoryId`, `songId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `category_songs_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `song_categories` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `category_songs_songId_fkey`
    FOREIGN KEY (`songId`) REFERENCES `songs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `catalog_versions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `mainVersion` DATETIME(3) NOT NULL,
  `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `notes` TEXT NULL,
  INDEX `catalog_versions_mainVersion_idx` (`mainVersion`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_invitations` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `username` VARCHAR(80) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `acceptedAt` DATETIME(3) NULL,
  `createdById` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `user_invitations_email_idx` (`email`),
  INDEX `user_invitations_expiresAt_idx` (`expiresAt`),
  INDEX `user_invitations_createdById_idx` (`createdById`),
  UNIQUE INDEX `user_invitations_tokenHash_key` (`tokenHash`),
  PRIMARY KEY (`id`),
  CONSTRAINT `user_invitations_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `name`, `email`, `username`, `passwordHash`, `role`)
VALUES (
  1,
  'Administrador',
  'admin@cancionero.local',
  'admin',
  '$2b$12$8VcQJkLGWq7daPdkReyRoO6nGHPc5FeczoiGJ5DcHvPCZ07U4F.Gi',
  'ADMIN'
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `email` = VALUES(`email`),
  `username` = VALUES(`username`),
  `passwordHash` = VALUES(`passwordHash`),
  `role` = VALUES(`role`);
