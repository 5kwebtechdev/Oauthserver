import { ITutor } from '../../models/tutor.model';

export const TUTORS: ITutor[] = [
  {
    id: 'rahul-sharma',
    name: 'Rahul Sharma',
    avatar: '/assets/images/Tutor Name.png',
    rating: 400,
    experience: '3-5 years Exp',
    subjects: ['Mathematics', 'Chemistry', 'Science', 'English', 'History'],
    classes: ['Class 8', 'Class 10', 'Class 11'],
    availableHours: 'Mon,Wed,Fri - 5:00PM-7:00PM',
    hourlyRate: 800,
    price: 800,
    hearts: 400,
    priceUnit: '/ Hour'
  },
  {
    id: 'meera-kapoor',
    name: 'Meera Kapoor',
    avatar: '/assets/images/Tutor Name.png',
    rating: 320,
    experience: '5 years Exp',
    subjects: ['English', 'History', 'Geography'],
    classes: ['Class 6', 'Class 8', 'Class 9'],
    availableHours: '4pm - 6pm',
    hourlyRate: 650,
    price: 650,
    hearts: 320,
    priceUnit: '/ Hour'
  },
  {
    id: 'arjun-iyer',
    name: 'Arjun Iyer',
    avatar: '/assets/images/Tutor Name.png',
    rating: 510,
    experience: '6 years Exp',
    subjects: ['Computer Science', 'Coding', 'Programming'],
    classes: ['Class 10', 'Class 11', 'Class 12'],
    availableHours: '6pm - 9pm',
    hourlyRate: 900,
    price: 900,
    hearts: 510,
    priceUnit: '/ Hour'
  },
  {
    id: 'sunita-verma',
    name: 'Sunita Verma',
    avatar: '/assets/images/Tutor Name.png',
    rating: 260,
    experience: '4 years Exp',
    subjects: ['Art & Craft', 'English'],
    classes: ['Class 1', 'Class 2', 'Class 3'],
    availableHours: '3pm - 5pm',
    hourlyRate: 400,
    price: 400,
    hearts: 260,
    priceUnit: '/ Hour'
  }
];
