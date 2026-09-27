# InBox — Intelligent Personal Task Manager (React Native Mobile App)

**InBox** is a unified mobile application built with **React Native** that aggregates, parses, and surfaces task-related intelligence from multiple communication channels into one centralized, clutter-free mobile task dashboard.

---

## 📱 Core Concepts & Sources Unified

Rather than managing tasks across fragmented apps, **InBox** combines task signals from:
* ✉️ **Email / Gmail**: Deadlines, syllabus reminders, assignment submissions
* 💬 **WhatsApp**: Group discussions, classmate syncs, chat promises
* 📹 **Zoom**: Meeting schedules, sprint reviews, action items from transcripts
* 📅 **Google Calendar**: Viva dates, exam slots, confirmed appointments
* 📍 **GPS & Location Services**: Proximity-based triggers (e.g. *Buy Petrol* near gas stations)

---

## 🚀 Navigation Structure

* **Home Tab**:
  * Brand header with real-time **Background Sync Active** indicator
  * **"Good morning, Rida"** dynamic greeting & date header
  * **Cognitive Assist Banner** highlighting pending auto-detected tasks with direct `[Review →]` action
  * Quick filter pills: `All`, `Today`, `Upcoming`, `Detections`, `Completed`
  * **Today's Schedule**: Real-time due tasks with source badges (`EMAIL`, `WHATSAPP`, `ZOOM`, `CALENDAR`, `LOCATION`), completion checkboxes, and quick action buttons (`Join`, `Navigate`)
  * **Upcoming Tasks** & **Pending Confirmations** previews
* **Tasks Tab**:
  * Unified search & multi-source filtering (`All Sources`, `Email`, `WhatsApp`, `Zoom`, `Calendar`, `Location`)
  * Status switcher (`Active Tasks`, `Completed`, `All Items`)
* **Detections Tab (AI Cognitive Assist)**:
  * Extracted actionable tasks from incoming chats & emails
  * Confidence score badges (e.g. `98% Confidence`)
  * Source snippet quotes & one-tap `[Add as Task]` / `[Dismiss]` workflow
* **Places Tab**:
  * Geofence radar visualizer with active radius triggers (e.g. *Buy Petrol* at Shell Gas Station within 500m)
  * Proximity radar toggle & location configuration
* **Profile Tab**:
  * User profile details (Rida)
  * Multi-source connectivity monitor (Gmail, WhatsApp, Zoom, Google Calendar, GPS)
  * Background parsing & confidence sensitivity settings
* **+ Add Task (Floating Action Button & Modal)**:
  * Accessible from any screen
  * Choose source type, schedule, priority level, location trigger, and notes

---

## 🛠️ How to Run the App

```bash
cd inbox-app

# Start the Expo Metro Bundler
npx expo start

# Run on Android emulator / connected USB device
npx expo start --android

# Run on iOS simulator (macOS)
npx expo start --ios

# Or scan the QR code displayed in the terminal using the Expo Go app on your physical Android/iOS phone
```
