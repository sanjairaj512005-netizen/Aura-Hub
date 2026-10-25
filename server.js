const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3001;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));


// =====================================================
// MYSQL CONNECTION
// =====================================================

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "Sanjai@936324",
    database: "aura_hub",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// =====================================================
// DATABASE SETUP
// =====================================================

async function setupDatabase() {

    try {

        const connection = await db.getConnection();

        console.log("MySQL connected successfully!");

        connection.release();


        // USERS
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);


        // NOTES
        await db.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
            )
        `);


        // TASKS
        await db.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
            )
        `);


        console.log("Users table ready!");
        console.log("Notes table ready!");
        console.log("Tasks table ready!");
        console.log("💎 AURA Hub is ready!");

    } catch (error) {

        console.error("Database setup error:");
        console.error(error.message);

    }
}


// =====================================================
// HOME PAGE
// =====================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {

    try {

        const { name, email } = req.body;


        if (!name || !email) {

            return res.status(400).json({
                success: false,
                message: "Name and email are required"
            });

        }


        const cleanName =
            name.trim();

        const cleanEmail =
            email.trim().toLowerCase();


        const [users] = await db.query(
            `
            SELECT id, name, email
            FROM users
            WHERE email = ?
            `,
            [cleanEmail]
        );


        // EXISTING USER
        if (users.length > 0) {

            const user = users[0];


            if (user.name !== cleanName) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This email is already registered with another name."
                });

            }


            return res.json({

                success: true,

                message: "Login successful",

                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }

            });

        }


        // NEW USER
        const [result] =
            await db.query(
                `
                INSERT INTO users
                (name, email)
                VALUES (?, ?)
                `,
                [
                    cleanName,
                    cleanEmail
                ]
            );


        return res.json({

            success: true,

            message:
                "Account created successfully",

            user: {
                id: result.insertId,
                name: cleanName,
                email: cleanEmail
            }

        });


    } catch (error) {

        console.error(
            "Login error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Login error. Please try again."

        });

    }

});


// =====================================================
// TASKS
// =====================================================

// GET TASKS

app.get(
    "/api/tasks/:userId",
    async (req, res) => {

        try {

            const userId =
                Number(req.params.userId);


            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        title,
                        completed,
                        created_at
                    FROM tasks
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    `,
                    [userId]
                );


            res.json(rows);


        } catch (error) {

            console.error(
                "Get tasks error:",
                error.message
            );


            res.status(500).json({
                message:
                    "Could not load tasks"
            });

        }

    }
);


// ADD TASK

app.post(
    "/api/tasks",
    async (req, res) => {

        try {

            const {
                userId,
                title
            } = req.body;


            if (
                !userId ||
                !title ||
                !title.trim()
            ) {

                return res.status(400).json({
                    message:
                        "Task title is required"
                });

            }


            const [result] =
                await db.query(
                    `
                    INSERT INTO tasks
                    (user_id, title, completed)
                    VALUES (?, ?, FALSE)
                    `,
                    [
                        userId,
                        title.trim()
                    ]
                );


            res.json({

                success: true,

                id:
                    result.insertId,

                title:
                    title.trim(),

                completed: false

            });


        } catch (error) {

            console.error(
                "Add task error:",
                error.message
            );


            res.status(500).json({
                message:
                    "Could not add task"
            });

        }

    }
);


// UPDATE TASK

app.put(
    "/api/tasks/:id",
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);

            const {
                completed
            } = req.body;


            await db.query(
                `
                UPDATE tasks
                SET completed = ?
                WHERE id = ?
                `,
                [
                    Boolean(completed),
                    id
                ]
            );


            res.json({
                success: true
            });


        } catch (error) {

            console.error(
                "Update task error:",
                error.message
            );


            res.status(500).json({
                message:
                    "Could not update task"
            });

        }

    }
);


// DELETE TASK

app.delete(
    "/api/tasks/:id",
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            await db.query(
                `
                DELETE FROM tasks
                WHERE id = ?
                `,
                [id]
            );


            res.json({
                success: true
            });


        } catch (error) {

            console.error(
                "Delete task error:",
                error.message
            );


            res.status(500).json({
                message:
                    "Could not delete task"
            });

        }

    }
);


// =====================================================
// NOTES
// =====================================================

// GET NOTES

app.get(
    "/api/notes/:userId",
    async (req, res) => {

        try {

            const userId =
                Number(req.params.userId);


            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        title,
                        content,
                        created_at
                    FROM notes
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    `,
                    [userId]
                );


            res.json(rows);


        } catch (error) {

            console.error(
                "Get notes error:",
                error.message
            );


            res.status(500).json({
                message:
                    "Could not load notes"
            });

        }

    }
);


// SAVE NOTE

app.post(
    "/api/notes",
    async (req, res) => {

        try {

            const {
                userId,
                title,
                content
            } = req.body;


            if (
                !userId ||
                !title ||
                !content
            ) {

                return res.status(400).json({
                    message:
                        "Title and content are required"
                });

            }


            const [result] =
                await db.query(
                    `
                    INSERT INTO notes
                    (user_id, title, content)
                    VALUES (?, ?, ?)
                    `,
                    [
                        userId,
                        title.trim(),
                        content.trim()
                    ]
                );


            res.json({

                success: true,

                id:
                    result.insertId,

                title:
                    title.trim(),

                content:
                    content.trim()

            });


        } catch (error) {

            console.error(
                "Save note error:",
                error.message
            );


            res.status(500).json({
                message:
                    "Could not save note"
            });

        }

    }
);


// DELETE NOTE

app.delete(
    "/api/notes/:id",
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            await db.query(
                `
                DELETE FROM notes
                WHERE id = ?
                `,
                [id]
            );


            res.json({
                success: true
            });


        } catch (error) {

            console.error(
                "Delete note error:",
                error.message
            );


            res.status(500).json({
                message:
                    "Could not delete note"
            });

        }

    }
);


// =====================================================
// DASHBOARD
// =====================================================

app.get(
    "/api/dashboard/:userId",
    async (req, res) => {

        try {

            const userId =
                Number(req.params.userId);


            const [totalRows] =
                await db.query(
                    `
                    SELECT COUNT(*) AS count
                    FROM tasks
                    WHERE user_id = ?
                    `,
                    [userId]
                );


            const [completedRows] =
                await db.query(
                    `
                    SELECT COUNT(*) AS count
                    FROM tasks
                    WHERE user_id = ?
                    AND completed = TRUE
                    `,
                    [userId]
                );


            const total =
                Number(
                    totalRows[0].count
                );


            const completed =
                Number(
                    completedRows[0].count
                );


            res.json({

                totalTasks:
                    total,

                completedTasks:
                    completed,

                pendingTasks:
                    total - completed,

                progress:
                    total === 0
                        ? 0
                        : Math.round(
                            (
                                completed /
                                total
                            ) * 100
                        )

            });


        } catch (error) {

            console.error(
                "Dashboard error:",
                error.message
            );


            res.status(500).json({
                message:
                    "Could not load dashboard"
            });

        }

    }
);


// =====================================================
// FREE LOCAL STUDY AI
// =====================================================
//
// No OpenAI API
// No API key
// No payment
//
// This assistant understands common academic
// questions and generates useful study answers.
// =====================================================

app.post(
    "/api/study-ai",
    async (req, res) => {

        try {

            const question =
                (
                    req.body.question ||
                    ""
                ).trim();


            if (!question) {

                return res.status(400).json({

                    answer:
                        "Please enter a question."

                });

            }


            const q =
                question.toLowerCase();


            let answer =
                generateStudyAnswer(q);


            res.json({
                answer
            });


        } catch (error) {

            console.error(
                "Study AI error:",
                error.message
            );


            res.status(500).json({

                answer:
                    "Sorry, I couldn't process that question."

            });

        }

    }
);


// =====================================================
// STUDY ANSWER ENGINE
// =====================================================

function generateStudyAnswer(q) {

    // -----------------------------------------------
    // OS
    // -----------------------------------------------

    if (
        q.includes("what is os") ||
        q.includes("operating system") ||
        q === "os"
    ) {

        return `
Operating System (OS)

An Operating System is system software that acts as a bridge between the user and computer hardware.

In simple words:
OS helps us use and control the computer.

Main functions:
• Process management
• Memory management
• File management
• Device management
• Security

Examples:
Windows, Linux, macOS, Android.

Exam definition:
"An Operating System is system software that manages computer hardware and software resources and provides services for application programs."
        `.trim();

    }


    // -----------------------------------------------
    // JAVA
    // -----------------------------------------------

    if (
        q.includes("java") &&
        (
            q.includes("what is") ||
            q.includes("define") ||
            q.includes("explain")
        )
    ) {

        return `
Java

Java is a high-level, object-oriented programming language used to develop many types of applications.

Simple meaning:
Java allows programmers to write programs that can run on different platforms using the Java Virtual Machine (JVM).

Important features:
• Object-oriented
• Platform independent
• Secure
• Robust
• Portable
• Multithreaded

Example:
Java is commonly used for enterprise applications, Android-related development, backend systems and many other software applications.
        `.trim();

    }


    // -----------------------------------------------
    // DBMS
    // -----------------------------------------------

    if (
        q.includes("dbms") ||
        q.includes("database management system")
    ) {

        return `
DBMS

DBMS stands for Database Management System.

It is software used to create, store, organize, retrieve and manage data in a database.

Important DBMS topics:
• ER Diagram
• Keys
• Relational Model
• SQL
• Normalization
• Transactions
• Concurrency Control
• Indexing

Examples:
MySQL, Oracle, PostgreSQL and Microsoft SQL Server.

Simple example:
A college database can store student names, register numbers, departments and marks.
        `.trim();

    }


    // -----------------------------------------------
    // ER DIAGRAM
    // -----------------------------------------------

    if (
        q.includes("er diagram") ||
        q.includes("entity relationship")
    ) {

        return `
ER Diagram

ER stands for Entity-Relationship.

An ER diagram is a graphical representation of entities, attributes and relationships in a database.

Main components:
• Entity
• Attribute
• Relationship

Example:

Student
   |
   | enrolls
   |
Course

Student and Course are entities.
"Enrolls" represents their relationship.

ER diagrams are mainly used during database design.
        `.trim();

    }


    // -----------------------------------------------
    // NORMALIZATION
    // -----------------------------------------------

    if (
        q.includes("normalization") ||
        q.includes("1nf") ||
        q.includes("2nf") ||
        q.includes("3nf") ||
        q.includes("bc nf")
    ) {

        return `
Database Normalization

Normalization is the process of organizing data in a database to reduce redundancy and avoid data inconsistency.

Important normal forms:

1NF:
Values should be atomic.

2NF:
Table should be in 1NF and have no partial dependency.

3NF:
Table should be in 2NF and have no transitive dependency.

BCNF:
A stronger version of 3NF where every determinant is a candidate key.

Main purpose:
Reduce duplicate data and improve database consistency.
        `.trim();

    }


    // -----------------------------------------------
    // SQL
    // -----------------------------------------------

    if (
        q.includes("sql") ||
        q.includes("select query") ||
        q.includes("insert query") ||
        q.includes("update query") ||
        q.includes("delete query")
    ) {

        return `
SQL

SQL stands for Structured Query Language.

It is used to communicate with and manage relational databases.

Common commands:

SELECT
Used to retrieve data.

INSERT
Used to add data.

UPDATE
Used to modify existing data.

DELETE
Used to remove data.

Example:

SELECT * FROM students;

This retrieves all records from the students table.
        `.trim();

    }


    // ---------------------------------------------
    // PYTHON
    // -----------------------------------------------

    if (
        q.includes("python") &&
        (
            q.includes("what is") ||
            q.includes("define") ||
            q.includes("explain")
        )
    ) {

        return `
Python

Python is a high-level, interpreted and general-purpose programming language.

Important features:
• Easy syntax
• Dynamically typed
• Object-oriented
• Large standard library
• Supports multiple programming paradigms

Python is commonly used in:
• Web development
• Data science
• Artificial Intelligence
• Machine Learning
• Automation
        `.trim();

    }


    // -----------------------------------------------
    // DATA STRUCTURES
    // -----------------------------------------------

    if (
        q.includes("data structure") ||
        q.includes("stack") ||
        q.includes("queue") ||
        q.includes("linked list")
    ) {

        return `
Data Structures

A data structure is a method of organizing and storing data so that it can be used efficiently.

Common data structures:

• Array
• Linked List
• Stack
• Queue
• Tree
• Graph
• Hash Table

Stack:
Follows LIFO - Last In, First Out.

Queue:
Follows FIFO - First In, First Out.

Example:
A stack is similar to a pile of plates.
        `.trim();

    }


    // -----------------------------------------------
    // ALGORITHMS
    // -----------------------------------------------

    if (
        q.includes("algorithm") ||
        q.includes("binary search") ||
        q.includes("linear search") ||
        q.includes("sorting")
    ) {

        return `
Algorithm

An algorithm is a finite sequence of well-defined steps used to solve a problem.

Characteristics:
• Input
• Output
• Definiteness
• Finiteness
• Effectiveness

Example:
Binary Search is an efficient searching algorithm that works on sorted data.

Basic idea:
1. Find the middle element.
2. Compare it with the target.
3. Search the appropriate half.
4. Repeat until the element is found.
        `.trim();

    }


    // -----------------------------------------------
    // TOC
    // -----------------------------------------------

    if (
        q.includes("toc") ||
        q.includes("theory of computation") ||
        q.includes("finite automata") ||
        q.includes("regular expression") ||
        q.includes("turing machine")
    ) {

        return `
Theory of Computation (TOC)

Theory of Computation studies mathematical models of computation and what problems computers can solve.

Important topics:
• Finite Automata
• Regular Languages
• Regular Expressions
• Context-Free Grammar
• Pushdown Automata
• Turing Machines
• Decidability

Simple idea:
TOC helps us understand how computational systems recognize languages and solve problems.
        `.trim();

    }


    // -----------------------------------------------
    // AI
    // -----------------------------------------------

    if (
        q.includes("artificial intelligence") ||
        q.includes("what is ai") ||
        q === "ai"
    ) {

        return `
Artificial Intelligence (AI)

Artificial Intelligence is a field of computer science that focuses on creating systems capable of performing tasks that normally require human intelligence.

Examples:
• Learning
• Reasoning
• Problem solving
• Understanding language
• Recognizing patterns

Applications:
• Chatbots
• Recommendation systems
• Self-driving technology
• Image recognition
• Virtual assistants
        `.trim();

    }


    // -----------------------------------------------
    // MACHINE LEARNING
    // -----------------------------------------------

    if (
        q.includes("machine learning") ||
        q.includes("what is ml") ||
        q === "ml"
    ) {

        return `
Machine Learning (ML)

Machine Learning is a branch of Artificial Intelligence where computers learn patterns from data and use those patterns to make predictions or decisions.

Main types:

1. Supervised Learning
Learns from labelled data.

2. Unsupervised Learning
Finds patterns in unlabelled data.

3. Reinforcement Learning
Learns through rewards and penalties.

Example:
A spam filter can learn from previous emails and classify new emails as spam or not spam.
        `.trim();

    }


    // -----------------------------------------------
    // C PROGRAMMING
    // -----------------------------------------------

    if (
        q.includes(" c ") ||
        q.startsWith("c ") ||
        q.includes("c programming") ||
        q.includes("what is c language")
    ) {

        return `
C Programming

C is a general-purpose procedural programming language.

Important concepts:
• Variables
• Data types
• Operators
• Conditions
• Loops
• Functions
• Arrays
• Pointers
• Structures

C is widely used for system programming and embedded systems.
        `.trim();

    }


    // -----------------------------------------------
    // OOP
    // -----------------------------------------------

    if (
        q.includes("oops") ||
        q.includes("oop") ||
        q.includes("object oriented")
    ) {

        return `
Object-Oriented Programming (OOP)

OOP is a programming approach based on objects and classes.

Four important principles:

1. Encapsulation
Wrapping data and methods together.

2. Inheritance
Creating a new class from an existing class.

3. Polymorphism
One interface can have different implementations.

4. Abstraction
Hiding unnecessary implementation details.

Java is an example of an object-oriented programming language.
        `.trim();

    }


    // -----------------------------------------------
    // EXAM QUESTIONS
    // -----------------------------------------------

    if (
        q.includes("exam") ||
        q.includes("important question") ||
        q.includes("13 mark") ||
        q.includes("13-mark") ||
        q.includes("2 mark")
    ) {

        return `
Exam Preparation

For effective preparation:

1. Understand the basic definition.
2. Learn important concepts.
3. Practice diagrams where applicable.
4. Write examples.
5. Practice previous-year questions.
6. Revise important keywords.

For a 13-mark answer, use this structure:

• Definition
• Introduction
• Main concepts
• Explanation
• Diagram / Example
• Advantages or applications
• Conclusion

Tell me the subject and topic, and I can prepare an exam-style answer.
        `.trim();

    }


    // -----------------------------------------------
    // GREETING
    // -----------------------------------------------

    if (
        q === "hi" ||
        q === "hello" ||
        q === "hey" ||
        q.includes("good morning") ||
        q.includes("good evening")
    ) {

        return `
👋 Hello! I'm AURA Study Assistant.

You can ask me academic questions about:

📚 Java
📚 DBMS
📚 Python
📚 C
📚 Data Structures
📚 Algorithms
📚 Operating Systems
📚 TOC
📚 AI / ML
📚 OOP
📚 SQL

You can also ask for:
• Simple explanations
• Exam answers
• 2-mark answers
• 13-mark answers
• Examples
• Study plans
        `.trim();

    }


    // -----------------------------------------------
    // DEFAULT ANSWER
    // -----------------------------------------------

    return `
I understand your question.

I'm AURA Study Assistant. I can help with academic concepts, exam preparation and programming topics.

Try asking your question with the subject or topic name.

Examples:

• What is Operating System?
• Explain DBMS normalization.
• What is inheritance in Java?
• Explain stack and queue.
• What is a finite automaton?
• Explain supervised learning.
• What is an algorithm?

For better answers, you can also say:
"Explain in simple words"
"Give me a 2-mark answer"
"Give me a 13-mark answer"
"Explain with example"
    `.trim();

}


// =====================================================
// TEST API
// =====================================================

app.get(
    "/api/test",
    async (req, res) => {

        try {

            await db.query("SELECT 1");


            res.json({

                success: true,

                message:
                    "💎 AURA Hub backend and MySQL are working!"

            });


        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    async () => {

        console.log(
            "-----------------------------------"
        );

        console.log(
            "💎 AURA HUB SERVER"
        );

        console.log(
            "-----------------------------------"
        );

        console.log(
            `Server running on http://localhost:${PORT}`
        );

        await setupDatabase();

    }
);