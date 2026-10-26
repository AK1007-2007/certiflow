$name = trim($_POST["student_name"] ?? "");
$email = trim($_POST["email"] ?? "");
$type = trim($_POST["certificate_type"] ?? "");
$purpose = trim($_POST["purpose"] ?? "");

$sql = "INSERT INTO certificate_requests
(student_name, enrollment_no, email, certificate_type, purpose, status)
VALUES (?, ?, ?, ?, ?, 'Pending')";

$stmt = $conn->prepare($sql);
$stmt->bind_param("sssss", $name, $enrollment, $email, $type, $purpose);
$stmt->execute();
$requestId = $stmt->insert_id;