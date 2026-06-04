# AGENTS.md

This document provides essential information for agents working within the `salud-ia-bot` codebase. It outlines the project's architecture, key commands, code conventions, and important considerations.

## 1. Project Overview

`salud-ia-bot` is a NestJS-based Telegram bot designed to provide health information and services using official public health data from Colombia. It features natural language processing capabilities via OpenRouter and processes local XML and TXT data files.

## 2. Essential Commands

The following `npm` scripts are available in `package.json`:

*   **Build**: `npm run build`
    *   Compiles the TypeScript code into JavaScript.
*   **Format**: `npm run format`
    *   Formats the codebase using Prettier.
*   **Start Application**:
    *   `npm start`: Starts the application in development mode without watch.
    *   `npm run start:dev`: Starts the application in development mode with file watching and hot-reloading.
    *   `npm run start:debug`: Starts the application in debug mode with file watching.
    *   `npm run start:prod`: Starts the application in production mode.
*   **Lint**: `npm run lint`
    *   Lints the TypeScript files and fixes issues where possible.
*   **Run Tests**:
    *   `npm test`: Runs unit tests using Jest.
    *   `npm run test:watch`: Runs unit tests in watch mode.
    *   `npm run test:cov`: Runs unit tests and generates a coverage report.
    *   `npm run test:debug`: Runs unit tests in debug mode.
    *   `npm run test:e2e`: Runs end-to-end tests.

## 3. Code Organization and Architecture

The application follows a modular NestJS architecture:

*   **`src/`**: Contains all application source code.
    *   **`main.ts`**: The application's entry point, responsible for bootstrapping the NestJS application.
    *   **`app.module.ts`**: The root module, configuring `ConfigModule` (for environment variables) and `TelegrafModule` (for Telegram bot integration). It imports `BotModule`.
    *   **`bot/`**: Encapsulates all Telegram bot-specific logic.
        *   **`bot.module.ts`**: The module for the bot's features.
        *   **`bot.update.ts`**: The primary handler for incoming Telegram messages, decorated with `@Update()`, `@Start()`, `@Help()`, and `@On('text')`. It dispatches user queries to specialized services.
        *   **Geolocalización (cerca de mí):** `bot.update.ts` detecta consultas de proximidad, solicita la ubicación mediante teclado (`request_location`) y procesa mensajes `@On('location')` para buscar prestadores cercanos (ej: `YopalHealthService.findNearby`).
        *   **`*.service.ts`**: Numerous services handle specific health data domains (e.g., `cali-health.service.ts`, `boyaca-health.service.ts`, `salud-publica.service.ts`, `sexual-health.service.ts`, `vaccination.service.ts`, `mental-health.service.ts`). These services contain the business logic for processing and responding to specific types of health-related queries.
        *   **`genkit.service.ts`**: Responsible for integrating with AI/LLM capabilities (likely through OpenRouter).
        *   **`user.service.ts`**: Manages user-specific data, such as tracking whether a user has been greeted.
        *   **`emergency-protocols.ts`**: Contains data or logic related to emergency health protocols.
        *   **`types/`**: Directory for TypeScript type definitions.
        *   **`stats/`**: Contains services related to health statistics.
*   **`data/`**: Stores local data files (XML, TXT) that serve as the bot's knowledge base.
*   **`test/`**: Contains Jest configurations and end-to-end test files.

## 4. Naming Conventions and Style Patterns

*   **Language**: TypeScript is used exclusively.
*   **Framework**: NestJS conventions are followed, utilizing its decorators extensively.
*   **File Naming**: Kebab-case (e.g., `sexual-health.service.ts`).
*   **Class/Interface Naming**: PascalCase (e.g., `BotUpdate`, `SexualHealthService`).
*   **Variable/Function Naming**: camelCase.
*   **Linting/Formatting**: `eslint` and `prettier` are configured; use `npm run lint` and `npm run format`.

## 5. Testing Approach

*   **Framework**: Jest is the primary testing framework.
*   **Unit Tests**: Located alongside the source files (e.g., `app.controller.spec.ts`).
*   **End-to-End Tests**: Defined in `test/app.e2e-spec.ts` and configured via `test/jest-e2e.json`.
*   **Coverage**: `npm run test:cov` can be used to generate test coverage reports.

## 6. Important Considerations and Gotchas

*   **Local Data Dependency**: The bot's responses are heavily reliant on the XML and TXT files stored in the `data/` directory. Updates to the bot's knowledge base typically involve modifying these local files and the services that consume them. The bot does *not* fetch real-time health data from external APIs unless explicitly implemented within a specific service.
*   **OpenRouter Abstraction**: AI/LLM interactions are managed through `genkit.service.ts` and are routed via OpenRouter. This provides an abstraction layer over direct LLM provider integration. When interacting with LLMs, ensure OpenRouter API keys and models are correctly configured in environment variables (`.env`).
*   **Region-Specific Logic**: `bot.update.ts` contains specific, prioritized logic for certain regions (e.g., "Yopal"). Queries mentioning these regions might bypass general NLP processing and be handled directly by their respective services. Be aware of this conditional routing.
*   **Long Message Handling**: The `sendLongMessage` utility in `bot.update.ts` is critical for breaking down extensive responses into smaller, Telegram-compliant chunks. When creating new message content, consider using this utility for potentially long replies.
*   **Environment Variable Validation**: Critical configuration, such as `TELEGRAM_BOT_TOKEN` and `OPENROUTER_API_KEY`, are validated at startup using Joi through `ConfigModule`. Ensure these are correctly set in the `.env` file or environment.
*   **User Greeting Logic**: The `userService` tracks whether a user has been greeted. The bot provides a personalized greeting for new users or upon explicit greetings. This state is likely persisted in `data/greeted_users.json`.
