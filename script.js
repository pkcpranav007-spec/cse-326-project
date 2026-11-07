var applicants = [];
var slots = [];
var bookings = [];
var nextApplicantNo = 101;
var nextBookingNo = 1;

function saveData() {
  try {
    localStorage.setItem("dtData", JSON.stringify({
      applicants: applicants, slots: slots, bookings: bookings,
      nextApplicantNo: nextApplicantNo, nextBookingNo: nextBookingNo
    }));
  } catch (e) {  }
}

function loadData() {
  try {
    var saved = localStorage.getItem("dtData");
    if (saved) {
      var d = JSON.parse(saved);
      applicants = d.applicants; slots = d.slots; bookings = d.bookings;
      nextApplicantNo = d.nextApplicantNo; nextBookingNo = d.nextBookingNo;
      return;
    }
  } catch (e) { }
  makeDefaultSlots();
}

function makeDefaultSlots() {
  var times = ["09:00", "11:00", "14:00", "16:00"];
  for (var i = 1; i <= 5; i++) {
    var d = new Date();
    d.setDate(d.getDate() + i);
    var dateStr = d.toISOString().slice(0, 10);
    for (var j = 0; j < times.length; j++) {
      slots.push({ id: "S" + (slots.length + 1), date: dateStr, time: times[j], seats: 3 });
    }
  }
  saveData();
}

function showMsg(id, text, good) {
  var box = document.getElementById(id);
  box.textContent = text;
  box.className = "msg " + (good ? "ok" : "err");
}

function showSection(name, btn) {
  var all = document.getElementsByClassName("section");
  for (var i = 0; i < all.length; i++) all[i].classList.remove("show");
  document.getElementById(name).classList.add("show");
  var buttons = document.querySelectorAll("nav button");
  for (var j = 0; j < buttons.length; j++) buttons[j].classList.remove("active");
  btn.classList.add("active");
  refreshAll();
}

function findApplicant(id) {
  id = id.trim().toUpperCase();
  for (var i = 0; i < applicants.length; i++) {
    if (applicants[i].id === id) return applicants[i];
  }
  return null;
}

function findSlot(id) {
  for (var i = 0; i < slots.length; i++) {
    if (slots[i].id === id) return slots[i];
  }
  return null;
}

function seatsTaken(slotId) {
  var count = 0;
  for (var i = 0; i < bookings.length; i++) {
    if (bookings[i].slotId === slotId && bookings[i].status !== "Cancelled") count++;
  }
  return count;
}

function seatsLeft(slot) {
  return slot.seats - seatsTaken(slot.id);
}

function activeBooking(applicantId) {
  for (var i = 0; i < bookings.length; i++) {
    if (bookings[i].applicantId === applicantId && bookings[i].status !== "Cancelled") return bookings[i];
  }
  return null;
}

function safe(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function registerApplicant() {
  var name = document.getElementById("r_name").value.trim();
  var age = Number(document.getElementById("r_age").value);
  var phone = document.getElementById("r_phone").value.trim();
  var cat = document.getElementById("r_cat").value;

  if (name === "" || phone === "" || age === 0) {
    showMsg("r_msg", "Please fill all the fields.", false); return;
  }
  if (phone.length !== 10 || isNaN(phone)) {
    showMsg("r_msg", "Phone number must be 10 digits.", false); return;
  }
  var minAge = (cat === "Heavy Vehicle") ? 20 : 18;
  if (age < minAge) {
    showMsg("r_msg", "Minimum age for " + cat + " is " + minAge + " years.", false); return;
  }

  var id = "DT" + nextApplicantNo;
  nextApplicantNo++;
  applicants.push({ id: id, name: name, age: age, phone: phone, category: cat });
  saveData();
  showMsg("r_msg", "Registered successfully! Your Applicant ID is " + id + ". Please remember it.", true);
  document.getElementById("r_name").value = "";
  document.getElementById("r_age").value = "";
  document.getElementById("r_phone").value = "";
}

function showSlots() {
  var html = "<table><tr><th>Slot</th><th>Date</th><th>Time</th><th>Seats Left</th></tr>";
  for (var i = 0; i < slots.length; i++) {
    var left = seatsLeft(slots[i]);
    html += "<tr><td>" + slots[i].id + "</td><td>" + slots[i].date + "</td><td>" + slots[i].time +
            "</td><td>" + (left > 0 ? left : "Full") + "</td></tr>";
  }
  html += "</table>";
  document.getElementById("slotTable").innerHTML = html;
}

function fillSlotDropdown(selectId) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = "";
  for (var i = 0; i < slots.length; i++) {
    var left = seatsLeft(slots[i]);
    if (left > 0) {
      var opt = document.createElement("option");
      opt.value = slots[i].id;
      opt.textContent = slots[i].date + " at " + slots[i].time + " (" + left + " seats left)";
      sel.appendChild(opt);
    }
  }
}

function bookSlot() {
  var app = findApplicant(document.getElementById("b_id").value);
  var slotId = document.getElementById("b_slot").value;

  if (!app) { showMsg("b_msg", "Applicant ID not found. Please register first.", false); return; }
  if (slotId === "") { showMsg("b_msg", "No slots available right now.", false); return; }

  var old = activeBooking(app.id);
  if (old && old.status === "Booked") {
    showMsg("b_msg", "You already have a booking. Use 'My Booking' to reschedule or cancel.", false); return;
  }
  if (old && (old.status === "Passed")) {
    showMsg("b_msg", "You have already passed the test.", false); return;
  }
  if (seatsLeft(findSlot(slotId)) <= 0) {
    showMsg("b_msg", "Sorry, this slot is full.", false); return;
  }

  var bookingId = "B" + nextBookingNo;
  nextBookingNo++;
  bookings.push({ id: bookingId, applicantId: app.id, slotId: slotId, status: "Booked" });
  saveData();
  showMsg("b_msg", "Slot booked! Your booking ID is " + bookingId + ".", true);
  refreshAll();
}

function findBooking() {
  var app = findApplicant(document.getElementById("m_id").value);
  var box = document.getElementById("m_details");
  box.innerHTML = "";

  if (!app) { showMsg("m_msg", "Applicant ID not found.", false); return; }

  var b = activeBooking(app.id);
  if (!b) { showMsg("m_msg", "Hello " + app.name + ", you have no active booking.", false); return; }

  var slot = findSlot(b.slotId);
  showMsg("m_msg", "Booking found.", true);

  var html = "<p><b>Name:</b> " + safe(app.name) + "<br>" +
             "<b>Vehicle:</b> " + app.category + "<br>" +
             "<b>Booking ID:</b> " + b.id + "<br>" +
             "<b>Slot:</b> " + slot.date + " at " + slot.time + "<br>" +
             "<b>Test Status:</b> " + b.status + "</p>";

  if (b.status === "Booked") {
    html += "<label>Reschedule to <select id='m_newslot'></select></label>" +
            "<button class='btn' onclick='rescheduleBooking(\"" + b.id + "\")'>Reschedule</button>" +
            "<button class='btn red' onclick='cancelBooking(\"" + b.id + "\")'>Cancel Booking</button>";
  }
  box.innerHTML = html;
  fillSlotDropdown("m_newslot");
}

function findBookingById(id) {
  for (var i = 0; i < bookings.length; i++) {
    if (bookings[i].id === id) return bookings[i];
  }
  return null;
}

function rescheduleBooking(bookingId) {
  var b = findBookingById(bookingId);
  var newSlotId = document.getElementById("m_newslot").value;
  if (newSlotId === "") { showMsg("m_msg", "No free slot available.", false); return; }
  if (newSlotId === b.slotId) { showMsg("m_msg", "You selected the same slot.", false); return; }
  b.slotId = newSlotId;
  saveData();
  findBooking();
  showMsg("m_msg", "Booking rescheduled successfully.", true);
}

function cancelBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel?")) return;
  var b = findBookingById(bookingId);
  b.status = "Cancelled";
  saveData();
  document.getElementById("m_details").innerHTML = "";
  showMsg("m_msg", "Booking cancelled. The seat is free for others now.", true);
}

function addSlot() {
  var date = document.getElementById("a_date").value;
  var time = document.getElementById("a_time").value;
  var seats = Number(document.getElementById("a_seats").value);
  if (date === "" || time === "" || seats < 1) {
    showMsg("a_msg", "Please enter date, time and seats.", false); return;
  }
  slots.push({ id: "S" + (slots.length + 1), date: date, time: time, seats: seats });
  saveData();
  showMsg("a_msg", "New slot added.", true);
  refreshAll();
}

function showAdminTable() {
  var html = "<table><tr><th>Booking</th><th>Applicant</th><th>Vehicle</th><th>Slot</th><th>Status</th></tr>";
  if (bookings.length === 0) html += "<tr><td colspan='5'>No bookings yet.</td></tr>";
  for (var i = 0; i < bookings.length; i++) {
    var b = bookings[i];
    var app = findApplicant(b.applicantId);
    var slot = findSlot(b.slotId);
    var statuses = ["Booked", "Passed", "Failed", "Absent", "Cancelled"];
    var options = "";
    for (var j = 0; j < statuses.length; j++) {
      options += "<option" + (statuses[j] === b.status ? " selected" : "") + ">" + statuses[j] + "</option>";
    }
    html += "<tr><td>" + b.id + "</td><td>" + safe(app.name) + " (" + app.id + ")</td><td>" + app.category +
            "</td><td>" + slot.date + " " + slot.time + "</td>" +
            "<td><select onchange='changeStatus(\"" + b.id + "\", this.value)'>" + options + "</select></td></tr>";
  }
  html += "</table><p class='small'>Total registered applicants: " + applicants.length + "</p>";
  document.getElementById("adminTable").innerHTML = html;
}

function changeStatus(bookingId, newStatus) {
  findBookingById(bookingId).status = newStatus;
  saveData();
  showAdminTable();
}

function refreshAll() {
  showSlots();
  fillSlotDropdown("b_slot");
  showAdminTable();
}

loadData();
refreshAll();