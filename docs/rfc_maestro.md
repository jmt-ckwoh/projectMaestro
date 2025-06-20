# RFC: Project Maestro - A Communication-Centric Code Generation Environment

**Status:** Proposed
**Owner:** @[Your Name]
**Reviewers:** Architect, Designer, Engineer, QA
**Created:** 2025-06-19
**Last Updated:** 2025-06-19

---

## 1. Overview

Project Maestro is a non-IDE application designed for structured code generation, targeting users who excel at communication and management rather than traditional engineering. Instead of a file-based interface, Maestro provides a project management and communication-centric UI where the user manages a team of specialized AI "personas." The system is designed to translate a user's vision into functional code by structuring conversations, baking in development best practices, and prompting the user for the clarity and direction needed to keep the project on track.

## 2. Motivation

**Current State:** Most generative AI coding tools are IDE plugins or chat interfaces that require a developer's mindset. A non-technical user with a clear vision ("vibe") struggles to provide the necessary structure for the AI to produce good results, as the tools are not designed to bridge this gap.

**Vision:** An application that empowers non-engineers to build software by leveraging their communication and project management skills. The user acts as a leader, guiding a team of AI agents (Producer, Architect, Engineer, QA) who collaborate to define, build, and test the application. The interface feels less like a code editor and more like a combination of Slack and Trello, making it intuitive for a managerial-style workflow.

**Strategic Value:** This project aims to unlock a new category of creators who are currently unable to translate their ideas into software. It focuses on the human-AI interaction patterns of management and delegation, rather than direct instruction, providing a unique approach to code generation.

## 3. Design Goals

* **User-as-Manager:** The primary user interaction model is management and delegation, not direct coding.
* **Communication-First Interface:** The UI prioritizes conversational and project management views over code and file lists.
* **Personified AI Team:** Core functionality is delivered through a team of distinct AI personas, each with specific roles, expertise, and system prompts.
* **Structured Idea Funnel:** The system actively guides the user through a workflow that turns a high-level "vibe" into a detailed specification, architecture, and project plan.
* **Best Practices by Default:** The workflows and agent behaviors will have software development best practices (e.g., clear specs, automated testing, version control) baked in.
* **Progressive Disclosure:** While the default interface is simple, power users can access and customize the underlying prompts, rules, and workflows for their agents.

## 4. Core Workflows

### 4.1. Project Initialization & Onboarding

The user's first experience will be a guided conversation. The system will prompt the user to "brain dump" their idea, encouraging voice input to capture as much detail as possible. A default team of AI personas, potentially with pre-set names and voices, will then begin asking clarifying questions to add depth and detail, mimicking a new project kickoff meeting.

### 4.2. Bug Triage & Resolution

When the QA agent finds a bug, it will be automatically added to the project backlog. The bug will be tagged to the specific "Story" whose requirements it violates. The user will be presented with a triage view to review new bugs, assess their severity, and prioritize them. The workflow will be designed with clear intervention points, allowing the user to validate fixes. While user validation is a step, it can be bypassed to maintain momentum.

## 5. Architecture

### 5.1. UI Framework & Design

The interface is envisioned as a single window with three distinct, persistent panels:

* **Left Panel (The "Slack"):** A chat interface for interacting with the AI team. This will function like a group chat, showing which persona is "speaking" and allowing the user to direct questions to specific agents or the group.
* **Center Panel (The "Trello"):** The main workspace. This area is context-dependent, displaying the project plan, task boards (Epics, Stories, Tasks), or architecture diagrams.
* **Right Panel (The "Team"):** Displays the roster of AI agents on the team.

**Agent Status Visualization:**
* The team panel will use simple visual cues (e.g., animated dots, swapping icons) to show agent status (e.g., "thinking," "coding").
* The user can click an agent's status to bring up a detailed view of its live activity.
* Agent attention will be visually linked to tasks on the main project board.
* Agents will post status updates to the chat panel, which can act as triggers for other agents to begin work in parallel.

> **Design Note:** The default view is "Slack + Trello." The mechanism for accessing other views (like a file browser or code editor) needs to be workshopped. Options include swapping the main panel's content entirely or adding new information in a horizontal/vertical split.

### 5.2. Agent Specialization

* **The Producer:** The user's primary partner. Its job is to facilitate, organize, and prompt the user for more detail. It takes notes, updates the project plan based on conversations, and ensures the process keeps moving forward.
* **The Architect:** Focuses on the high-level system design. It helps define the tech stack and structure. It must have access to tools for web searches and fetching developer documentation to work from structured, factual information beyond its training data.
* **The Engineer:** The primary "doer" for coding tasks. It takes well-defined tasks from the project plan and writes the code. It should be able to work in a "pair programming" loop with the QA agent.
* **The QA Engineer:** A test-oriented engineer.
    * **Primary Role:** Writes and runs automated tests (e.g., unit tests) based on the project specifications. The long-term vision includes using tools like Playwright for automated functional testing.
    * **Secondary Role (Debugger):** When something is broken, the QA agent takes the lead on finding the root cause. Its workflow will be optimized for diagnostic precision (e.g., using logging) to avoid the common LLM pitfall of "shotgun" fixing that can make problems worse.

### 5.3. Technical Stack

* **LLM Orchestration:** The system will be architected to be flexible and model-agnostic.
    * **Initial Implementation:** Start with a single, powerful LLM for all agents, differentiated by system prompts.
    * **Roadmap:** Evolve to support multiple models, allowing for smaller, faster, specialized models for specific tasks.
    * **Bring-Your-Own-Key (BYOK):** Users will be able to plug in their own API keys for services like OpenAI, Anthropic, Google AI, etc., following patterns from tools like Cursor.
    * **Backend Investigation:** A key decision is whether to use a direct LLM API or a CLI tool like `claude-code`, which provides a more integrated terminal environment. This needs to be investigated.
* **Memory System:** A multi-tiered memory system will provide context to agents.
    * **Global Memory:** User-level preferences and rules that persist across all projects (e.g., "I always want my API responses in this format").
    * **Project Memory:** Project-specific documentation, coding patterns, naming conventions, and key learnings relevant to the entire project.
    * **Task Memory:** Temporary, task-specific context (e.g., challenges encountered). This memory serves as an archived document once the task is complete.
* **Version Control:** The system will use a standard `git` repository under the hood but will provide a simplified interface. The user will interact with "checkpoints" and have simple tools to roll back changes without needing to know git commands. Users will have the option to connect a GitHub repository.

## 6. Success Metrics

### 6.1. Quantitative
* Time from project idea to functional MVP.
* Number of user interventions required to fix a bug.

### 6.2. Qualitative
* User confidence in the generated code and architecture.
* **QA Agent Efficiency:** The QA agent's success will be measured by its ability to produce a green test suite and receive user validation, but most importantly, by its efficiency in fixing bugs. Success is defined by using diagnostics to apply a precise fix in a minimal number of attempts, not by the number of bugs found.

## 7. Risks & Mitigations

| Risk                                     | Mitigation                                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User doesn't provide enough structure** | The Producer agent's core responsibility is to prompt the user for the necessary details. The workflow will be gated, preventing the Engineer from starting work on poorly defined tasks.      |
| **AI team gets stuck in a feedback loop** | The user always has the final say and can override or approve a plan to move forward. The Producer can be designed to detect circular conversations and prompt for a tie-breaking decision. |
| **Generated code quality is poor** | The process enforces a strong planning and architecture phase upfront. The dedicated QA agent ensures that code is tested against the spec, creating a tight feedback loop.                    |
| **UI becomes too complex** | The primary interface will remain simple. Advanced features (like editing agent prompts) will be located in separate, "expert-level" settings menus.                                       |

## 8. Next Steps

1.  **Technical Spike:** Build a proof-of-concept for the core interaction: a user prompt being analyzed by multiple "agent" prompts (Producer, Architect) to generate a series of clarifying questions.
2.  **Design Mockups:** Create low-fidelity wireframes of the three-pane UI to validate the user experience flow, specifically exploring options for navigating between views (swapping vs. splitting).
3.  **Define Agent Personas:** Write the initial detailed system prompts and rules for the v1 Producer and Architect agents, including tool access for the Architect.
4.  **Team Discussion:** Review this updated RFC with the full team to gather feedback and refine the scope for Phase 1.