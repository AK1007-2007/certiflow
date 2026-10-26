<?php
$host = "localhost";
$db   = "certificate_portal";
$user = "root";
$pass = "";

$conn = new mysqli($host, $user, $db, $pass);

if ($conn->connect_error) {
    die("Database connection failed");
}
$conn->set_charset("utf8mb4");
?>