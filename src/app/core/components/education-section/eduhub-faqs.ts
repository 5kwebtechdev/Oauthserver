// Exact copy from the "Eduhub FAQs" tab of the supplied Google Doc.
export interface EduhubFaq { question: string; answer: string; }

export const EDUHUB_FAQS: Record<string, EduhubFaq[]> = {
  tutor: [
    { question: 'How do I find a tutor on SuperMeApp?', answer: 'You can browse tutor listings by subject, class/grade, location, teaching mode, experience, fees, and other relevant filters. Compare profiles and choose a tutor based on your requirements.' },
    { question: 'What information can I see in a tutor’s profile?', answer: 'Tutor profiles include the subjects they teach, classes/grades taught, qualifications, experience, teaching mode, location, fees, availability, introduction, and other information provided by the tutor.' },
    { question: 'How do I contact a tutor I am interested in?', answer: 'Open the tutor’s listing and use the available contact or enquiry option to connect with them. You can discuss your requirements, fees, schedule and other details directly with the tutor.' },
    { question: 'How can I know if a tutor is suitable for my child?', answer: 'Review the tutor’s profile, qualifications, experience, subjects, teaching approach, fees, and other available information. You may also speak with the tutor before deciding whether they are a good fit.' },
    { question: 'Are tutor fees fixed on SuperMeApp?', answer: 'No. Tutor fees are determined by individual tutors and may vary based on subject, class, experience, teaching mode, duration, and other factors. Please confirm the final fee directly with the tutor.' },
    { question: 'Does SuperMe provide or guarantee the tutor’s services?', answer: 'SuperMeApp acts as a listing and discovery platform that helps users find and connect with tutors. Tutor-provided information, availability, fees, qualifications and services should be verified directly with the tutor before making a decision.' }
  ],
  academy: [
    { question: 'What information can I see about an academy?', answer: 'You can view details such as courses offered, subjects offered, location, contact information and other important information depending on what the academy has shared.' },
    { question: 'Can I find academies for different subjects and skills?', answer: 'Yes. You can explore academies offering academic subjects, competitive exam preparation, sports, fitness, arts, music, dance, coding, languages, and other skill-based courses.' },
    { question: 'Can I find both online and offline academies?', answer: 'Yes. You can find academies based on the learning mode they offer, including online, offline, or both.' },
    { question: 'Can I search for academies near my location?', answer: 'Yes. You can search and filter academies by city, locality, or preferred location to find options that are convenient for you.' },
    { question: 'How can I know if an academy is suitable for my child?', answer: "Check the academy's details listed and contact them to see whether they match your child's requirements." },
    { question: 'Can I contact an academy through EduHub?', answer: 'Yes. Where contact options are provided, you can use the available details or enquiry options to connect directly with the academy.' },
    { question: 'Does EduHub provide or run these academies?', answer: 'No. EduHub acts as a listing platform that helps users discover academies and their available information. The academy is responsible for its own courses, fees, services, and operations.' }
  ],
  counsellor: [
    { question: 'What type of counsellors can I find on EduHub?', answer: 'You can discover counsellors offering support in areas such as Mental health, Personality Development, Career counselling, College Admissions, Childhood Development, based on their listed expertise.' },
    { question: 'How do I choose the right counsellor?', answer: "Consider the counsellor's area of expertise, qualifications, experience, age groups served, location, consultation mode and services offered to find someone suited to your needs." },
    { question: 'Can I find counsellors for children and teenagers?', answer: "Yes. You can look for counsellors who specifically mention working with children, tweens, teenagers, or young adults, depending on the counsellor's listed experience." },
    { question: 'Can I find both online and offline counsellors?', answer: 'Yes. You can find counsellors based on the consultation mode they offer, including online, offline, or both.' },
    { question: 'Can I find a counsellor near my location?', answer: 'Yes. You can search by city or locality to discover counsellors available in your preferred area.' },
    { question: 'What information can I see about a counsellor?', answer: 'Depending on the listing, you may find information such as qualifications, experience, areas of expertise, services offered, age groups served, consultation mode, location, fees, timings, and contact details.' },
    { question: 'Can I contact a counsellor through EduHub?', answer: 'Yes. Where contact or enquiry options are available, you can use the information provided in the listing to connect directly with the counsellor.' },
    { question: 'Does EduHub provide counselling services?', answer: 'No. EduHub is a listing platform that helps users discover and connect with counsellors. The counsellor is responsible for their own services, consultation, fees, and professional relationship with the user.' }
  ],
  secondHandBooks: [
    { question: 'What are second-hand books?', answer: 'Second-hand books are pre-owned books that are being sold by another user.' },
    { question: 'Can I see the condition of the book before buying?', answer: 'Yes, photos are provided in the listings and you should review them carefully before placing your order.' },
    { question: 'Can I return a second-hand book?', answer: 'No, you cannot return the books once received.' },
    { question: 'Does SuperMeApp inspect every second-hand book?', answer: 'No. SuperMeApp provides the marketplace/platform and does not physically inspect every pre-owned book before it is sold.' },
    { question: 'Can I sell my old books on SuperMeApp?', answer: 'Yes, you can create a listing by providing accurate book details, condition, price and photos.' },
    { question: 'What should I mention when listing a second-hand book?', answer: 'Include:\nBook name and author\nPublisher\nEdition/year\nCondition\nAny writing or highlighting\nMissing or damaged pages\nOther visible defects\nClear photos\nSelling price' },
    { question: 'Can I sell books with writing or highlighting?', answer: 'Yes, provided the condition is clearly disclosed in the listing and the book is otherwise suitable for sale.' },
    { question: 'What should I check before buying?', answer: 'Before purchasing, check the book title, author, edition, condition, photos, price, seller information, and return/refund terms.' }
  ],
  bookStore: [
    { question: 'What information can I see about a book store?', answer: "You can view details such as the store's location, contact information, opening hours, types of books available, categories, and other information provided by the store." },
    { question: 'Can I find book stores near my location?', answer: 'Yes. You can search for book stores by city, locality, or preferred location to find convenient options.' },
    { question: 'Can I contact a book store through EduHub?', answer: 'Yes. Where contact or enquiry options are available, you can use the information provided in the listing to connect directly with the book store.' },
    { question: 'Does EduHub sell books or operate these book stores?', answer: 'No. EduHub acts as a listing platform that helps users discover book stores and the products or services they offer. The book store is responsible for its own inventory, pricing, sales, and services.' }
  ],
  stationeryShop: [
    { question: 'What information can I see about a stationary store?', answer: "You can view details such as the store's location, contact information, opening hours, types of books available, categories, and other information provided by the store." },
    { question: 'Can I find book stores near my location?', answer: 'Yes. You can search for book stores by city, locality, or preferred location to find convenient options.' },
    { question: 'Can I contact a book store through EduHub?', answer: 'Yes. Where contact or enquiry options are available, you can use the information provided in the listing to connect directly with the book store.' },
    { question: 'Does EduHub sell books or operate these stationary stores?', answer: 'No. EduHub acts as a listing platform that helps users discover stationary stores and the products or services they offer. The stationary store is responsible for its own inventory, pricing, sales, and services.' }
  ],
  eventsWorkshops: [
    { question: 'What information can I see about an event or workshop?', answer: 'You can view details such as the event name, description, date, time, venue, age group, category, fees, organiser details, and registration information, depending on what the organiser has provided.' },
    { question: 'What types of events and workshops can I find on EduHub?', answer: 'You can discover a variety of events and workshops, including educational, creative, sports, fitness, technology, arts, music, dance, career, skill-building, and recreational activities.' },
    { question: 'Can I find events and workshops for different age groups?', answer: 'Yes. You can find activities suitable for children, tweens, teenagers, adults, or specific age groups, based on the age criteria provided by the organiser.' },
    { question: 'Can I find both online and offline events or workshops?', answer: 'Yes. Listings may include online, offline, or hybrid events and workshops, depending on what the organiser offers.' },
    { question: 'Can I find events and workshops near my location?', answer: 'Yes. You can search and filter listings by city or location to discover events and workshops that are convenient for you.' },
    { question: 'Can I see the fees and registration details before signing up?', answer: 'Yes. Wherever provided by the organiser, you can view the event fee, registration requirements, booking details, and other participation information before registering.' },
    { question: 'How can I contact the organiser if I have questions?', answer: 'You can use the contact or enquiry details provided in the listing.' },
    { question: 'Does EduHub organise or conduct these events and workshops?', answer: 'No. EduHub acts as a listing platform that helps users discover events and workshops. The respective organiser is responsible for conducting the event, managing registrations, fees, schedules, and other arrangements.' }
  ],
  pgHostels: [
    { question: 'What information can I see about a PG or hostel?', answer: 'You can view details such as location, room types, occupancy, rent, security deposit, amenities, food availability, house rules, and contact details, depending on what the property has listed.' },
    { question: 'Can I find PGs or hostels near my college, school, or workplace?', answer: 'Yes. You can search by city, locality, or preferred area to find accommodation close to your desired location.' },
    { question: 'What amenities can I check before choosing a PG or hostel?', answer: 'Depending on the listing, you may be able to check amenities such as Wi-Fi, meals, laundry, housekeeping, AC, parking, power backup, study areas, security, and common spaces.' },
    { question: 'Can I see the rent and other charges before contacting the property?', answer: 'Yes. If provided by the property, you can check the monthly rent, security deposit, maintenance charges, food charges, and other applicable costs.' },
    { question: 'Can I contact the PG or hostel directly through EduHub?', answer: 'Yes. Where contact or enquiry options are available, you can connect directly with the property to ask questions, check availability, and confirm terms.' },
    { question: 'Does EduHub own or manage the PGs and hostels listed?', answer: 'No. EduHub acts as a listing platform to help users discover PGs and hostels. The property owner or operator is responsible for the accommodation, pricing, facilities, availability, and services provided.' }
  ]
};
