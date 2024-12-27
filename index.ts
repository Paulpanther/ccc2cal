import ical, {ICalCalendarMethod} from "ical-generator";
import fs from "node:fs";

require('dotenv').config()

const base = "https://api.events.ccc.de/congress/2024";

async function fetchCalendar() {
  const auth = await fetch(`${base}/auth/get-token`, {
    method: "POST",
    headers: {
      'Content-Type': "application/json",
    },
    body: JSON.stringify({
      username: process.env.username,
      password: process.env.password,
    })});
  const token = (await auth.json())['token'];

  const eventsRes = await fetch(`${base}/me/events`, {
    headers: {
      'Content-Type': "application/json",
      Authorization: `Token ${token}`,
    }
  });
  const events = await eventsRes.json();

  const cal = ical({name: 'ccc2cal'});
  cal.method(ICalCalendarMethod.REQUEST);

  for (const eventId of events) {
    console.log(`Loading event ${eventId}`);

    const eventRes = await fetch(`${base}/event/${eventId}`, {
      headers: {
        'Content-Type': "application/json",
        Authorization: `Token ${token}`,
      }
    });
    const event = await eventRes.json();

    let room = undefined;
    if (event['room']) {
      const roomRes = await fetch(`${base}/room/${event['room']}`, {
        headers: {
          'Content-Type': "application/json",
          Authorization: `Token ${token}`,
        }
      });
      const roomData = await roomRes.json();
      room = `${roomData['name']} ${roomData['public_url']}`;
    }

    cal.createEvent({
      start: new Date(event['schedule_start']),
      end: new Date(event['schedule_end']),
      summary: event['name'],
      description: event['description'],
      location: room,
      url: event['url']
    });
  }

  return cal;
}

async function main() {
  const cal = await fetchCalendar();

  fs.writeFileSync('cal.ics', cal.toString());
}

main();