SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `app`;
CREATE TABLE `app` (
  `app_id` varchar(64) NOT NULL,
  `app_secret` varchar(64) NOT NULL,
  `app_name` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
