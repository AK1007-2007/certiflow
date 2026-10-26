document.getElementById("requestForm")?.addEventListener("submit", e => {
  const p=document.querySelector('[name="purpose"]').value.trim();
  if(p.length < 10){ alert("Purpose should contain at least 10 characters."); e.preventDefault(); }
});