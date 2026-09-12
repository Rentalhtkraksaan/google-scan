-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Host: localhost    Database: saas_qr_review
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `outlets`
--

DROP TABLE IF EXISTS `outlets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outlets` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ownerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `googleReviewUrl` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `outlets_ownerId_key` (`ownerId`),
  CONSTRAINT `outlets_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `outlets`
--

LOCK TABLES `outlets` WRITE;
/*!40000 ALTER TABLE `outlets` DISABLE KEYS */;
INSERT INTO `outlets` VALUES ('cmtqtrqhw0006hyq4ct001h18','cmtqtrqhu0004hyq4z9xqzcxy','Diva Swalayan Kraksaan','https://search.google.com/local/writereview?placeid=ChIJcZlCR2cB1y0RocRq1VPhzQI','2026-09-07 05:53:41.348','2026-09-07 16:44:21.440'),('cmtqul01g0003hy04rnc0mepv','cmtqul00x0001hy045qy6j1wt','ikan bakar pantura','https://search.google.com/local/writereview?placeid=ChIJMxLks3YB1y0RwvKpXNdFkQU','2026-09-07 06:16:26.741','2026-09-07 16:44:21.541'),('cmtqviq1s0003hymwm3eq5s9l','cmtqviq1j0001hymwbe59q1yd','Diva Swalayan Kraksaan','https://search.google.com/local/writereview?placeid=ChIJcZlCR2cB1y0RocRq1VPhzQI','2026-09-07 06:42:40.096','2026-09-07 16:44:21.440'),('cmtres8lf0003hyy8u36au8jd','cmtres8kw0001hyy8r38ewyny','BINGXUE Kraksaan','https://search.google.com/local/writereview?placeid=ChIJDVyBQwAB1y0RZeDpXwVtybk','2026-09-07 15:41:56.740','2026-09-07 16:44:21.548'),('cmtrfecuy0007hyy8ln7fe3jr','cmtrfecuo0005hyy8mm03qtm3','tian lala kraksaan','https://search.google.com/local/writereview?placeid=ChIJp29XXgAB1y0R5pZrmMAhyc4','2026-09-07 15:59:08.698','2026-09-07 17:06:12.097'),('cmts1zapo000bhyy80oh9oy4i','cmts1zap70009hyy8kvpap1ww','Ayam Geprek Sai Paiton','https://search.google.com/local/writereview?placeid=ChIJt4YaGLID1y0Rdhi8PEQ-TfQ','2026-09-08 02:31:17.244','2026-09-08 02:35:59.248'),('cmts27q32000fhyy8ca5ke0xb','cmts27q2q000dhyy8vwqpqb5c','Raluna Cafe Paiton','https://search.google.com/local/writereview?placeid=ChIJdZo8ar8D1y0R1zYTsah8xs4','2026-09-08 02:37:50.414','2026-09-08 03:20:44.026'),('cmts4hj7a000jhyy87ouhbo5a','cmts4hj71000hhyy8p6fyv6gb','Pujasera K56 Paiton Harmony','https://search.google.com/local/writereview?placeid=ChIJCTNQDQAD1y0Rg4HCiPhhBg8','2026-09-08 03:41:27.287','2026-09-08 03:41:27.287'),('cmts4iy5j000nhyy8qir0mp9j','cmts4iy4u000lhyy8o79bmv1o','roemah amelia','https://search.google.com/local/writereview?placeid=ChIJYfx02PAD1y0R8rmdoQV7gYs','2026-09-08 03:42:33.319','2026-09-08 03:49:13.533');
/*!40000 ALTER TABLE `outlets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qr_cards`
--

DROP TABLE IF EXISTS `qr_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qr_cards` (
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `outletId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `scanCount` int NOT NULL DEFAULT '0',
  `fallbackUrl` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'http://localhost:3000',
  `assignedAdminId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`code`),
  UNIQUE KEY `qr_cards_outletId_key` (`outletId`),
  KEY `qr_cards_assignedAdminId_idx` (`assignedAdminId`),
  CONSTRAINT `qr_cards_assignedAdminId_fkey` FOREIGN KEY (`assignedAdminId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `qr_cards_outletId_fkey` FOREIGN KEY (`outletId`) REFERENCES `outlets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qr_cards`
--

LOCK TABLES `qr_cards` WRITE;
/*!40000 ALTER TABLE `qr_cards` DISABLE KEYS */;
INSERT INTO `qr_cards` VALUES ('c-001','cmtqtrqhw0006hyq4ct001h18','ACTIVE',164,'https://cv-aditya.vercel.app','cmtqtrqhs0002hyq4jtaglw92','2026-09-07 05:53:41.350','2026-09-08 03:39:30.256'),('c-002','cmtqul01g0003hy04rnc0mepv','ACTIVE',11,'http://localhost:3000','cmtqtrqhs0002hyq4jtaglw92','2026-09-07 05:53:41.352','2026-09-08 03:39:30.256'),('c-003','cmtqviq1s0003hymwm3eq5s9l','ACTIVE',4,'http://localhost:3000','cmtqtrqhs0002hyq4jtaglw92','2026-09-07 05:53:41.354','2026-09-08 03:39:30.256'),('c-004','cmtres8lf0003hyy8u36au8jd','ACTIVE',7,'http://localhost:3000','cmtqtrqhs0002hyq4jtaglw92','2026-09-07 05:53:41.357','2026-09-08 03:39:30.256'),('c-005','cmtrfecuy0007hyy8ln7fe3jr','ACTIVE',7,'http://localhost:3000','cmtqtrqhs0002hyq4jtaglw92','2026-09-07 05:53:41.360','2026-09-08 03:39:30.256'),('c-9-006','cmts1zapo000bhyy80oh9oy4i','ACTIVE',3,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-08 03:39:30.256'),('c-9-007','cmts27q32000fhyy8ca5ke0xb','ACTIVE',4,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-08 03:39:30.256'),('c-9-008','cmts4hj7a000jhyy87ouhbo5a','ACTIVE',1,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-08 03:41:33.983'),('c-9-009','cmts4iy5j000nhyy8qir0mp9j','INACTIVE',5,'https://cv-aditya.vercel.app','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-08 04:51:24.216'),('c-9-010',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-011',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-012',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-013',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-014',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-015',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-016',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-017',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-018',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-019',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-020',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-021',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-022',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-023',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-024',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-025',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-026',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-027',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-028',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-029',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-030',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-031',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-032',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-033',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-034',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-035',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-036',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-037',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-038',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-039',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-040',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-041',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-042',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-043',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-044',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-045',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-046',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-047',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-048',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-049',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-050',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-051',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-052',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-053',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-054',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-055',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-07 14:32:38.137','2026-09-07 14:32:38.137'),('c-9-056',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-08 03:29:07.299','2026-09-08 03:29:07.299'),('c-9-057',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-08 03:29:07.299','2026-09-08 03:29:07.299'),('c-9-058',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-08 03:29:07.299','2026-09-08 03:29:07.299'),('c-9-059',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-08 03:29:07.299','2026-09-08 03:29:07.299'),('c-9-060',NULL,'ACTIVE',0,'http://localhost:3000','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-08 03:29:07.299','2026-09-08 03:29:07.299');
/*!40000 ALTER TABLE `qr_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fullName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `whatsappNumber` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('SUPER_ADMIN','ADMIN','USER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  KEY `users_createdById_idx` (`createdById`),
  CONSTRAINT `users_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('cmtqtrqhn0000hyq413b5xpq9','admin@example.com','$2b$10$FJ/.mNFGo1m8MCShySXwcudD.Qt8J98nT8CvgNbjhUeB7wEovXFRa','Super Administrator','6281234567890','SUPER_ADMIN',NULL,'2026-09-07 05:53:41.339','2026-09-07 05:53:41.339',1),('cmtqtrqhs0002hyq4jtaglw92','mitra1@example.com','$2b$10$FJ/.mNFGo1m8MCShySXwcudD.Qt8J98nT8CvgNbjhUeB7wEovXFRa','Mitra Lapangan Jakarta','6281298765432','ADMIN','cmtqtrqhn0000hyq413b5xpq9','2026-09-07 05:53:41.344','2026-09-07 05:53:41.344',1),('cmtqtrqhu0004hyq4z9xqzcxy','kopi@example.com','$2b$10$FJ/.mNFGo1m8MCShySXwcudD.Qt8J98nT8CvgNbjhUeB7wEovXFRa','Budi Santoso','6281355551234','USER','cmtqtrqhs0002hyq4jtaglw92','2026-09-07 05:53:41.346','2026-09-07 15:04:00.542',1),('cmtqul00x0001hy045qy6j1wt','yuda@gmail.com','$2b$10$uMNQ1COowpllcISvJJBpmugpdE49FgGSFkg2dU00dtuSSvmwoZ5gC','yuda','6285123456789','USER','cmtqtrqhn0000hyq413b5xpq9','2026-09-07 06:16:26.721','2026-09-07 16:39:06.861',1),('cmtqviq1j0001hymwbe59q1yd','chika@gmail.com','$2b$10$ebw7G0KmmKg0bukEGTb2duZjtirVgMC3HRiXL.yllCCa4X3BxaZwG','chika','6285123456789','USER','cmtqtrqhn0000hyq413b5xpq9','2026-09-07 06:42:40.087','2026-09-07 06:50:09.045',1),('cmtrcb3rw0001hy8o8rj2p8z9','chika1@gmail.com','$2b$10$GVCUQ742X7I.ERIShZW8FebxePMDi3.3e0lPWZPRvV0zc.MsMIiZm','chika_admin','6285123456789','ADMIN','cmtqtrqhn0000hyq413b5xpq9','2026-09-07 14:32:38.092','2026-09-08 04:51:50.983',1),('cmtres8kw0001hyy8r38ewyny','bing@gmail.com','$2b$10$ZFLev/4BRKe.H9izuxxx6OI5pTYgXycvSeJct2BPVKCS4vnsIY47.','bing','6285123456789','USER','cmtqtrqhn0000hyq413b5xpq9','2026-09-07 15:41:56.715','2026-09-07 16:35:26.895',1),('cmtrfecuo0005hyy8mm03qtm3','diy@gmail.com','$2b$10$.LtIDtQRlaOMpkEemkSJAe0Opfc/U3XcoLvJmA1nGnCpOVOzHQQde','diy','6285123456789','USER','cmtqtrqhn0000hyq413b5xpq9','2026-09-07 15:59:08.670','2026-09-07 16:58:21.085',1),('cmts1zap70009hyy8kvpap1ww','achmadfurqon33@gmail.com','$2b$10$jtJKi2aN1cHmhQB8Th2fmecjU3ABgciwTv1bz6DXHYFXoHvheLHhC','JSON Stakeholder Registration','6285123456789','USER','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-08 02:31:17.223','2026-09-08 04:55:19.400',1),('cmts27q2q000dhyy8vwqpqb5c','luqmanubaidillahfirmansyah@gmail.com','$2b$10$LjWfBz.8QfTRNQsV0KrsSO.3PdNhKqq5MewKI7Za.ugEIpjsXQVgu','LUQMAN UBAIDILLAH FIRMANSYAH','6281355551234','USER','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-08 02:37:50.402','2026-09-08 04:55:19.413',1),('cmts4hj71000hhyy8p6fyv6gb','achmadfurqon331@gmail.com','$2b$10$QqGc/zSjTkOPWXav2j0P.OHt6Mvufcn5sabHh6pJo9O.sR5EQ1rvO','JSON Stakeholder Registration','6285123456789','USER','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-08 03:41:27.277','2026-09-08 04:55:19.421',1),('cmts4iy4u000lhyy8o79bmv1o','chidut@gmail.com','$2b$10$P2CrWcSMWnV863KkWwLHgublgeCToL9YnDZs1y0qo4HdeWtDmj5R2','chidut gendut','6285123456789','USER','cmtrcb3rw0001hy8o8rj2p8z9','2026-09-08 03:42:33.294','2026-09-08 04:55:19.430',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-08 11:55:50
