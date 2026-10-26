CREATE DATABASE certificate_portal;
USE certificate_portal;
CREATE TABLE certificate_requests(
 id INT AUTO_INCREMENT PRIMARY KEY,
 student_name VARCHAR(100) NOT NULL,
 enrollment_no VARCHAR(30) NOT NULL,
 email VARCHAR(120) NOT NULL,
 certificate_type VARCHAR(80) NOT NULL,
 purpose TEXT NOT NULL,
 status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
 requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);