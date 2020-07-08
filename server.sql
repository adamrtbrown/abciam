SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

DROP TABLE IF EXISTS `apps`;
CREATE TABLE `apps` (
  `app_id` varchar(64) NOT NULL,
  `app_secret` varchar(64) NOT NULL,
  `app_name` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `signing_keys`;
CREATE TABLE `signing_keys` (
  `kid` int(11) NOT NULL,
  `private` varchar(4096) NOT NULL,
  `public` varchar(4096) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `sign_creds`;
CREATE TABLE `sign_creds` (
  `provider` varchar(16) NOT NULL,
  `kid` varchar(128) NOT NULL,
  `key` varchar(1024) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `uid` varchar(64) NOT NULL,
  `app_id` varchar(64) NOT NULL,
  `user_id` varchar(256) NOT NULL,
  UNIQUE KEY `app_id_user_name` (`app_id`,`user_id`),
  KEY `app_id` (`app_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

