import type { Scenario } from "./api";

export const DEFAULT_SCENARIOS: Scenario[] = [
  { id: "cafe-order", title: "At a Café", language: "Spanish", description: "Order coffee and pastries", starter: "Hola, ¿me puede dar un café con leche?" },
  { id: "hotel-checkin", title: "Hotel Check-in", language: "Spanish", description: "Check into a hotel", starter: "Buenas tardes, tengo una reserva a nombre de Maria." },
  { id: "airport-security", title: "Airport Security", language: "Spanish", description: "Pass through security politely" },
  { id: "small-talk", title: "Small Talk", language: "Spanish", description: "Casual conversation at a conference" },
  { id: "restaurant-reservation", title: "Restaurant Reservation", language: "Spanish", description: "Book a table by phone" },
  { id: "directions", title: "Asking for Directions", language: "Spanish", description: "Find your way in a city" },
  { id: "shopping", title: "Shopping", language: "Spanish", description: "Ask about sizes and prices" },
  { id: "pharmacy", title: "At the Pharmacy", language: "Spanish", description: "Ask for common medicine" },
  { id: "train-ticket", title: "Train Tickets", language: "Spanish", description: "Buy tickets and ask schedules" },
  { id: "apartment-viewing", title: "Apartment Viewing", language: "Spanish", description: "Discuss rental terms" },
  { id: "job-interview", title: "Job Interview", language: "Spanish", description: "Practice common interview questions" },
  { id: "sales-pitch", title: "Sales Pitch", language: "German", description: "Present a product to a client" },
  { id: "meeting-lead", title: "Leading a Meeting", language: "German", description: "Set agenda and drive outcomes" },
  { id: "introductions", title: "Introductions", language: "French", description: "Meet new people politely" },
  { id: "bakery-order", title: "At the Bakery", language: "French", description: "Order baguettes and pastries", starter: "Bonjour, je voudrais deux baguettes, s'il vous plaît." },
];