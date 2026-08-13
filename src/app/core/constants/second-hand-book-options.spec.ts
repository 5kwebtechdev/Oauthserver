import {
  COLLEGE_DEGREE_STREAM_OPTIONS,
  COLLEGE_YEAR_OPTIONS,
  EXAM_PREP_TARGET_EXAM_OPTIONS,
  GENERAL_GENRE_OPTIONS,
  GENERAL_LANGUAGE_OPTIONS,
  SCHOOL_BOARD_OPTIONS,
  SCHOOL_CLASS_OPTIONS,
  SCHOOL_SUBJECT_OPTIONS,
  collegeSubjectsForDegree
} from './second-hand-book-options';

describe('Second-Hand Books option taxonomy', () => {
  const labels = (options: ReadonlyArray<{ value: string }>) => options.map(option => option.value);

  it('contains every Figma school option', () => {
    expect(labels(SCHOOL_CLASS_OPTIONS)).toEqual(['Nursery', ...Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`)]);
    expect(labels(SCHOOL_BOARD_OPTIONS)).toEqual(['CBSE', 'ICSE', 'State Board', 'IB', 'Other']);
    expect(labels(SCHOOL_SUBJECT_OPTIONS)).toEqual(['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'History', 'Geography', 'Economics', 'Computer Science']);
  });

  it('contains every Figma college, exam and general option', () => {
    expect(labels(COLLEGE_DEGREE_STREAM_OPTIONS)).toEqual(['Engineering (B.Tech / B.E)', 'Medicine (MBBS / BDS)', 'Commerce (B.Com / MBA)', 'Arts / Humanities (BA / MA)', 'Science (B.Sc / M.Sc)', 'Law (LLB)', 'Other']);
    expect(labels(COLLEGE_YEAR_OPTIONS)).toEqual(['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']);
    expect(labels(EXAM_PREP_TARGET_EXAM_OPTIONS)).toEqual(['JEE Main / Advanced', 'NEET / AIIMS', 'UPSC Civil Services', 'CAT / MBA Entrance', 'GATE', 'SSC / CGL', 'Banking (IBPS / SBI)', 'NDA / Defence', 'Other']);
    expect(labels(GENERAL_GENRE_OPTIONS)).toEqual(['Mystery / thriller', 'Romance', 'Science Fiction', 'Fantasy', 'Historical Fiction', 'Classic Literature', 'Biography / Memoir', 'Mythology', 'Horror', 'Other']);
    expect(labels(GENERAL_LANGUAGE_OPTIONS)).toEqual(['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Bengali', 'Kannada', 'Other']);
  });

  it('exposes engineering subjects only for Engineering until other real mappings exist', () => {
    expect(labels(collegeSubjectsForDegree('Engineering (B.Tech / B.E)'))).toEqual(['Engineering Mathematics', 'Data Structures & Algorithms', 'Electronic Devices & Circuits', 'Engineering Mechanics', 'Thermodynamics', 'Other']);
    expect(collegeSubjectsForDegree('Medicine (MBBS / BDS)')).toEqual([]);
  });
});
