-- Adminer 4.7.7 MySQL dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

DROP TABLE IF EXISTS `apps`;
CREATE TABLE `apps` (
  `app_id` varchar(64) NOT NULL,
  `app_secret` varchar(64) NOT NULL,
  `app_name` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `sign_creds`;
CREATE TABLE `sign_creds` (
  `provider` varchar(16) NOT NULL,
  `kid` varchar(128) NOT NULL,
  `key` varchar(1024) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `signing_keys`;
CREATE TABLE `signing_keys` (
  `id` int NOT NULL,
  `latest` varchar(4096) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `previous` varchar(4096) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


SET NAMES utf8mb4;

DROP TABLE IF EXISTS `tokens`;
CREATE TABLE `tokens` (
  `user_id` bigint NOT NULL,
  `sig` varchar(256) NOT NULL,
  KEY `user_id` (`user_id`),
  CONSTRAINT `tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `uid` varchar(64) NOT NULL,
  `app_id` varchar(64) NOT NULL,
  `provider_id` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `app_id_user_name` (`app_id`,`provider_id`),
  KEY `app_id` (`app_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tokens` (
  `user_id` bigint NOT NULL,
  `sig` varchar(256) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

-- 2020-08-28 19:43:32

