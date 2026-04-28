class EventManager {
  constructor() {
    this.events = this.loadEvents();
    this.listEl = document.getElementById('events-list');
    this.formEl = document.getElementById('event-form');
    this.titleEl = document.getElementById('event-title');
    this.dateEl = document.getElementById('event-date');
    this.typeEl = document.getElementById('event-type');
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.formEl.onsubmit = (e) => {
      e.preventDefault();
      this.addEvent(
        this.titleEl.value,
        this.dateEl.value,
        this.typeEl.value
      );
      this.formEl.reset();
    };
  }

  addEvent(title, date, type) {
    const event = {
      id: Date.now(),
      title,
      date,
      type
    };
    this.events.push(event);
    this.saveEvents();
    this.render();
    this.notify(event);
  }

  deleteEvent(id) {
    this.events = this.events.filter(ev => ev.id !== id);
    this.saveEvents();
    this.render();
  }

  saveEvents() {
    localStorage.setItem('events', JSON.stringify(this.events));
  }

  loadEvents() {
    return JSON.parse(localStorage.getItem('events') || '[]');
  }

  render() {
    this.listEl.innerHTML = '';
    if (this.events.length === 0) {
      this.listEl.innerHTML = '<li>No events yet.</li>';
      return;
    }
    this.events.forEach(ev => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `
        <div class="event-info">
          <strong>${ev.title}</strong> <span>(${ev.type})</span> <br>
          <small>${ev.date}</small>
        </div>
        <div class="event-actions">
          <button data-id="${ev.id}" class="delete-btn">Delete</button>
        </div>
      `;
      li.querySelector('.delete-btn').onclick = () => this.deleteEvent(ev.id);
      this.listEl.appendChild(li);
    });
  }

  notify(event) {
    if (Notification && Notification.permission === 'granted') {
      new Notification('Event Added', {
        body: `${event.title} (${event.type}) on ${event.date}`
      });
    } else if (Notification && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new EventManager();
});
