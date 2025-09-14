[![CI](https://github.com/iniemamocny/MebloPlan/actions/workflows/ci.yml/badge.svg)](https://github.com/iniemamocny/MebloPlan/actions/workflows/ci.yml)
[![Pages](https://github.com/iniemamocny/MebloPlan/actions/workflows/pages.yml/badge.svg)](https://github.com/iniemamocny/MebloPlan/actions/workflows/pages.yml)
[![License: NonCommercial](https://img.shields.io/badge/License-NonCommercial-blue.svg)](LICENSE)


# MebloPlan (Kitchi)

Projekt oparty na Vite + React + TypeScript + Zustand + @react-three/fiber.

## Szybki start
```bash
npm install
npm run dev
```

## Build produkcyjny
```bash
npm run build
```

## GitHub Pages
Workflow **pages.yml** publikuje `dist/` na GitHub Pages (repo: `iniemamocny/MebloPlan`).
Adres po wdrożeniu: https://iniemamocny.github.io/MebloPlan/

## Codespaces
Repo → **Code → Create codespace on main**
Po starcie:
```bash
npm ci
npm run dev
```
Port 5173 otworzy się automatycznie.

## Mobilne skanowanie i import pomieszczeń

W katalogu `mobile/` znajdują się przykładowe moduły do skanowania pomieszczeń:

* `ios/RoomPlanScanner.swift` — wykorzystuje ARKit/RoomPlan do wygenerowania modelu pokoju i zapisania go do pliku OBJ.
* `android/RoomScanner.kt` — używa ARCore z Depth API do rekonstrukcji siatki i eksportu do glTF.

Po wykonaniu skanu plik można zapisać lokalnie i przesłać przez HTTPS do backendu (kod przykładowy znajduje się w modułach mobilnych).

W aplikacji webowej przejdź do zakładki **Room** i w sekcji "Import room scan" wybierz plik `.gltf`, `.glb` lub `.obj`. Model zostanie dodany do sceny, a jego jednostki i położenie zostaną dopasowane do układu MebloPlanu.

Obsługiwane formaty: **glTF** oraz **OBJ**.

## Rysowanie ścian

Aby rozpocząć rysowanie ścian, naciśnij w widoku sceny klawisz `P` lub wybierz narzędzie ołówka w zakładce **Room**. Na pasku narzędzi pojawią się opcje edycji ścian. Zakończ rysowanie, wciskając `Esc`.

## Licencja

Projekt jest udostępniany na licencji **MebloPlan Non-Commercial License 1.0**. Użytkowanie, kopiowanie oraz modyfikacja kodu są dozwolone wyłącznie w celach niekomercyjnych i przy zachowaniu informacji o autorach. Wykorzystanie komercyjne wymaga wcześniejszej zgody wszystkich współautorów.

Wszyscy współautorzy wyrazili zgodę na zmianę licencji. Zmiana obowiązuje jedynie dla wersji opublikowanych po 2025-08-30; wcześniejsze wydania pozostają na licencji MIT.

