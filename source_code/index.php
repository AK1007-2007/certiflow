<form action="request.php" method="POST" id="requestForm">
  <label>Student Name <input name="student_name" required></label>
  <label>Enrollment No. <input name="enrollment_no" required></label>
  <label>Email <input type="email" name="email" required></label>
  <select name="certificate_type" required>
    <option>Bonafide Certificate</option>
    <option>Character Certificate</option>
  </select>
  <textarea name="purpose" required></textarea>
  <button type="submit">Submit Request</button>
</form>