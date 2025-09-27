[![CI](https://github.com/iniemamocny/MebloPlan/actions/workflows/ci.yml/badge.svg)](https://github.com/iniemamocny/MebloPlan/actions/workflows/ci.yml)
[![Pages](https://github.com/iniemamocny/MebloPlan/actions/workflows/pages.yml/badge.svg)](https://github.com/iniemamocny/MebloPlan/actions/workflows/pages.yml)
[![License: NonCommercial](https://img.shields.io/badge/License-NonCommercial-blue.svg)](LICENSE)


# MebloPlan (Kitchi)

Projekt zawiera podstawowe moduły logiki aplikacji bez interfejsu graficznego.

## Konfiguracja Supabase

Aplikacja wykorzystuje Supabase do zarządzania kontami użytkowników. Aby uruchomić środowisko developerskie lub wdrożeniowe z obsługą logowania:

1. Utwórz nowy projekt w [Supabase](https://supabase.com/).
2. W panelu **Authentication → Providers** włącz logowanie przy użyciu adresu e-mail i hasła.
3. Przejdź do **Project settings → API** i skopiuj wartości `Project URL` oraz `anon public API key`.
4. Utwórz plik `.env.local` (lub ustaw zmienne środowiskowe na platformie hostingowej) i dodaj:

   ```bash
   VITE_SUPABASE_URL="https://example.supabase.co"
   VITE_SUPABASE_ANON_KEY="twój_publiczny_klucz_anon"
   ```

5. Jeśli tworzysz tabele do przechowywania danych użytkownika (np. `plans`, `profiles`), pamiętaj o włączeniu mechanizmu Row Level Security (RLS) oraz zdefiniowaniu polityk dostępu. Przykładowa polityka ograniczająca dostęp tylko do właściciela rekordu:

   ```sql
   alter table plans enable row level security;

   create policy "Użytkownik widzi tylko swoje plany"
     on plans for select using (auth.uid() = user_id);

   create policy "Użytkownik może modyfikować swoje plany"
     on plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```

6. Po zapisaniu zmian uruchom aplikację (`npm run dev`). Formularz logowania automatycznie połączy się z Twoim projektem Supabase.

## Licencja

Projekt jest udostępniany na licencji **MebloPlan Non-Commercial License 1.0**. Użytkowanie, kopiowanie oraz modyfikacja kodu są dozwolone wyłącznie w celach niekomercyjnych i przy zachowaniu informacji o autorach. Wykorzystanie komercyjne wymaga wcześniejszej zgody wszystkich współautorów.

Wszyscy współautorzy wyrazili zgodę na zmianę licencji. Zmiana obowiązuje jedynie dla wersji opublikowanych po 2025-08-30; wcześniejsze wydania pozostają na licencji MIT.

