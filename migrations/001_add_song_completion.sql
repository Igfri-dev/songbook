USE `cancionero`;

ALTER TABLE `songs`
  ADD COLUMN IF NOT EXISTS `isComplete` BOOLEAN NOT NULL DEFAULT FALSE
  AFTER `isPublished`;
