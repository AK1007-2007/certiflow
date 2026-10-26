$result = $conn->query(
  "SELECT id, student_name, enrollment_no,
   certificate_type, status, requested_at
   FROM certificate_requests
   ORDER BY requested_at DESC"
);

while ($row = $result->fetch_assoc()) {
    echo htmlspecialchars($row["student_name"]);
}