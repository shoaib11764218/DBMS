import "dotenv/config";
import mongoose from "mongoose";
import Course from "./models/Course.js";

if (!process.env.MONGODB_URI) {
  throw new Error("Set MONGODB_URI in server/.env before adding sample courses.");
}

const term = process.env.COURSE_TERM || "Fall 2026";
const courses = [
  {
    code: "CPE 101",
    title: "Introduction to Computer Engineering",
    instructor: "Dr. Maya Chen",
    department: "Computer Engineering",
    description: "Explore the foundations of computer engineering, from binary logic and basic circuits to the software and hardware systems that power modern computing.",
    term
  },
  {
    code: "CPE 220",
    title: "Data Structures and Algorithms",
    instructor: "Prof. Daniel Okafor",
    department: "Computer Engineering",
    description: "Study the data structures and algorithmic techniques used to build efficient, reliable software, with an emphasis on problem solving and analysis.",
    term
  },
  {
    code: "CPE 230",
    title: "Digital Logic Design",
    instructor: "Dr. Priya Raman",
    department: "Computer Engineering",
    description: "Learn to design and analyze combinational and sequential digital circuits, including logic gates, state machines, and programmable hardware.",
    term
  },
  {
    code: "CPE 310",
    title: "Computer Organization",
    instructor: "Dr. Ethan Brooks",
    department: "Computer Engineering",
    description: "Connect software to hardware by exploring instruction sets, processor design, memory hierarchies, and the organization of modern computers.",
    term
  },
  {
    code: "CPE 320",
    title: "Operating Systems",
    instructor: "Prof. Sofia Alvarez",
    department: "Computer Engineering",
    description: "Examine how operating systems manage processes, memory, storage, and concurrency, and how these services support application software.",
    term
  },
  {
    code: "CPE 330",
    title: "Database Systems",
    instructor: "Dr. Noah Williams",
    department: "Computer Engineering",
    description: "Design and query relational databases, learn data modeling and transactions, and explore the principles behind dependable data systems.",
    term
  },
  {
    code: "CPE 340",
    title: "Computer Networks",
    instructor: "Dr. Aisha Patel",
    department: "Computer Engineering",
    description: "Understand network architecture, routing, transport protocols, and the practical principles that make communication across the internet possible.",
    term
  },
  {
    code: "CPE 350",
    title: "Software Engineering",
    instructor: "Prof. Lucas Martin",
    department: "Computer Engineering",
    description: "Practice collaborative software development through requirements, design, testing, version control, and maintainable project workflows.",
    term
  },
  {
    code: "CPE 410",
    title: "Introduction to Artificial Intelligence",
    instructor: "Dr. Grace Kim",
    department: "Computer Engineering",
    description: "Explore search, reasoning, and machine learning concepts while building a foundation for understanding intelligent computer systems.",
    term
  },
  {
    code: "CPE 420",
    title: "Embedded Systems",
    instructor: "Dr. Omar Haddad",
    department: "Computer Engineering",
    description: "Design software for resource-constrained devices and learn how microcontrollers, sensors, interfaces, and real-time constraints work together.",
    term
  }
];

try {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const course of courses) {
    await Course.updateOne(
      { code: course.code, term: course.term },
      { $setOnInsert: { ...course, status: "approved" } },
      { upsert: true, runValidators: true }
    );
  }
  console.log(`Sample courses ready for ${term}. Instructor names are illustrative demo data.`);
} finally {
  await mongoose.disconnect();
}
