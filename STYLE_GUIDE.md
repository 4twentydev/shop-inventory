# Employee Barcode Generator - Style Guide

## Overview

This style guide documents the design system used in the Employee Barcode Generator application. Use this as a reference to maintain consistent styling across related applications.

**Technology Stack:**
- Next.js 16+ with React 19+
- Tailwind CSS 4
- Framer Motion for animations
- Geist font family

---

## Color System

### Light Theme (Default)

```css
--background: #f8f5f0;        /* Warm sand/beige background */
--foreground: #171717;        /* Dark text */
--surface: #ffffff;           /* White surfaces/cards */
--surface-muted: #f1ede7;     /* Light muted surface */
--border: #e4ded6;            /* Light borders */
--border-strong: #cfc6bb;     /* Stronger borders */
--muted: #6b6b6b;             /* Secondary text */
--muted-strong: #4a4a4a;      /* Tertiary text */
--accent-primary: #e16f47;    /* Warm orange - primary CTA */
--accent-secondary: #2961a1;  /* Blue - secondary accent */
```

### Dark Theme

```css
--background: #0b0b0b;        /* Dark background */
--foreground: #f5f2ee;        /* Light text */
--surface: #141210;           /* Dark surface/cards */
--surface-muted: #1c1916;     /* Darker muted surface */
--border: #2c2824;            /* Dark borders */
--border-strong: #3b3530;     /* Stronger dark borders */
--muted: #b5ada4;             /* Secondary text */
--muted-strong: #d4ccc3;      /* Tertiary text */
```

### Semantic Colors

```css
--success: #10b981;           /* Emerald - active states, success messages */
--error: #f43f5e;             /* Rose - errors, delete actions */
--warning: #fbbf24;           /* Amber - warnings */
```

### Usage Classes

```css
.text-strong      /* Primary text: var(--foreground) */
.text-muted       /* Secondary text: var(--muted) */
.text-subtle      /* Tertiary text: var(--muted-strong) */
.bg-base          /* Background: var(--background) */
.surface          /* Surface/card background: var(--surface) */
.border-subtle    /* Border: var(--border) */
.border-strong    /* Border: var(--border-strong) */
```

---

## Typography

### Font Families

**Primary Font:** Geist Sans
```tsx
import { Geist } from 'next/font/google';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
```

**Monospace Font:** Geist Mono (available for code/technical content)
```tsx
import { Geist_Mono } from 'next/font/google';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});
```

### Font Sizes

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem (12px) | Labels, captions, badge text |
| `text-sm` | 0.875rem (14px) | Body text, form labels, buttons |
| `text-base` | 1rem (16px) | Default body text |
| `text-lg` | 1.125rem (18px) | Section headings |
| `text-xl` | 1.25rem (20px) | Page headings |
| `text-2xl` | 1.5rem (24px) | Major headings |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Form labels, emphasis |
| `font-semibold` | 600 | Headings, buttons |

### Typography Patterns

**Company Branding:**
```tsx
<p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">
  Elward Systems
</p>
```

**Page Title:**
```tsx
<h1 className="text-lg font-semibold text-strong">
  Employee Barcode Labels
</h1>
```

**Section Heading:**
```tsx
<h2 className="text-2xl font-semibold text-strong">
  Generate an employee barcode label
</h2>
```

**Body Text:**
```tsx
<p className="text-sm text-muted">
  Regular body text content
</p>
```

---

## Component Patterns

### Buttons

#### Primary Button
```tsx
<button className="btn-primary rounded-full px-6 py-3 text-sm font-semibold transition-all hover:brightness-95 disabled:opacity-60">
  Primary Action
</button>
```

CSS:
```css
.btn-primary {
  background-color: var(--accent-primary);
  color: white;
}
```

#### Secondary Button
```tsx
<button className="rounded-full border border-subtle px-4 py-2 text-xs font-semibold text-subtle transition-all hover:border-strong hover:text-strong">
  Secondary Action
</button>
```

#### Danger/Delete Button
```tsx
<button className="rounded-full border border-rose-500 px-4 py-2 text-xs font-semibold text-rose-500 transition-all hover:bg-rose-500 hover:text-white">
  Delete
</button>
```

### Cards

```tsx
<div className="rounded-3xl border border-subtle bg-[color:var(--surface)] p-6 shadow-sm">
  {/* Card content */}
</div>
```

**Variants:**
- Small card: `rounded-2xl p-4`
- Medium card: `rounded-3xl p-6`
- Large card: `rounded-3xl p-8`

### Form Elements

#### Text Input
```tsx
<input
  type="text"
  className="w-full rounded-2xl border border-subtle bg-transparent px-4 py-3 text-sm text-strong placeholder-muted focus:border-[color:var(--accent-secondary)] focus:outline-none"
  placeholder="Enter text..."
/>
```

#### Select Dropdown
```tsx
<select className="w-full rounded-2xl border border-subtle bg-transparent px-4 py-3 text-sm text-strong focus:border-[color:var(--accent-secondary)] focus:outline-none">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

#### Form Label
```tsx
<label className="text-sm font-medium text-subtle">
  Field Label
</label>
```

### Badges

#### Active/Success Badge
```tsx
<span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
  Active
</span>
```

#### Inactive Badge
```tsx
<span className="inline-flex rounded-full bg-[color:var(--surface)] px-3 py-1 text-xs font-medium text-subtle">
  Inactive
</span>
```

#### Warning Badge
```tsx
<span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
  Warning
</span>
```

### Search/Autocomplete

```tsx
<div className="relative">
  <input
    type="text"
    placeholder="Start typing a name..."
    className="w-full rounded-2xl border border-subtle bg-transparent px-4 py-3 text-sm"
  />
  {/* Dropdown suggestions */}
  <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-auto rounded-2xl border border-subtle bg-[color:var(--surface)] shadow-lg">
    <button className="w-full px-4 py-3 text-left text-sm hover:bg-[color:var(--surface-muted)]">
      Suggestion item
    </button>
  </div>
</div>
```

### Toast Notifications

```tsx
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  className="fixed right-6 top-6 z-50 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg"
>
  <div className="flex items-start gap-3 p-4">
    {/* Icon */}
    <div className="text-2xl">{icon}</div>
    {/* Content */}
    <div className="flex-1">
      <p className="font-semibold text-strong">{title}</p>
      <p className="text-sm text-muted">{message}</p>
    </div>
  </div>
  {/* Color indicator bar */}
  <div className="h-1.5 bg-emerald-500" />
</motion.div>
```

---

## Layout Structure

### App Layout

```tsx
<div className="flex min-h-screen flex-col bg-base">
  {/* Header */}
  <header className="border-b border-subtle bg-[color:var(--surface)]">
    <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
      {/* Logo/Branding */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">
          Company Name
        </p>
        <h1 className="text-lg font-semibold text-strong">App Title</h1>
      </div>
      {/* Navigation or actions */}
      <nav className="flex items-center gap-4">
        {/* Nav items */}
      </nav>
    </div>
  </header>

  {/* Main content */}
  <main className="flex-1">
    <div className="mx-auto max-w-5xl px-6 py-10">
      {children}
    </div>
  </main>
</div>
```

### Two-Column Grid Layout

```tsx
<div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] xl:gap-8">
  {/* Left column */}
  <section className="flex flex-col gap-6">
    {/* Content */}
  </section>

  {/* Right column */}
  <aside className="flex flex-col gap-6">
    {/* Content */}
  </aside>
</div>
```

### Responsive Grid

```tsx
<div className="grid gap-4 md:grid-cols-2">
  {items.map(item => (
    <div key={item.id}>{/* Item */}</div>
  ))}
</div>
```

---

## Spacing System

### Container Padding
- Small: `px-4 py-4` (16px)
- Medium: `px-6 py-6` (24px)
- Large: `px-8 py-8` (32px)

### Content Gaps
- Tight: `gap-2` (8px)
- Normal: `gap-4` (16px)
- Relaxed: `gap-6` (24px)
- Spacious: `gap-8` (32px)

### Max Width Containers
```tsx
<div className="mx-auto max-w-5xl"> {/* 64rem = 1024px */}
  {/* Content */}
</div>
```

---

## Border Radius

| Class | Radius | Usage |
|-------|--------|-------|
| `rounded-lg` | 0.5rem (8px) | Small elements |
| `rounded-xl` | 0.75rem (12px) | Medium elements |
| `rounded-2xl` | 1rem (16px) | Inputs, smaller cards |
| `rounded-3xl` | 1.5rem (24px) | Large cards |
| `rounded-full` | 9999px | Buttons, badges, pills |

---

## Shadows

```css
shadow-sm    /* Subtle card depth */
shadow-lg    /* Dropdown/modal elevation */
```

**Usage:**
- Cards: `shadow-sm`
- Dropdowns: `shadow-lg`
- Modals: `shadow-lg`

---

## Animations

### Page Transitions (Framer Motion)

```tsx
import { motion } from 'framer-motion';

<motion.section
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* Content */}
</motion.section>
```

### Staggered List Animations

```tsx
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: i * 0.05 }}
  >
    {/* Item */}
  </motion.div>
))}
```

### Hover Transitions

```css
transition-all hover:brightness-95  /* Buttons */
transition-all hover:bg-surface-muted  /* List items */
```

---

## Theme Implementation

### HTML Setup

```tsx
<html lang="en" data-theme="dark" className="antialiased">
```

### Theme Toggle

```tsx
'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="rounded-full border border-subtle p-2.5 text-subtle transition-all hover:border-strong hover:text-strong"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

### Global CSS (Tailwind 4)

```css
@import 'tailwindcss';

@theme {
  --color-strong: var(--foreground);
  --color-muted: var(--muted);
  --color-subtle: var(--muted-strong);
  --color-accent-primary: var(--accent-primary);
  --color-accent-secondary: var(--accent-secondary);
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
}

html {
  color-scheme: dark;
}

html[data-theme='light'] {
  color-scheme: light;

  --background: #f8f5f0;
  --foreground: #171717;
  --surface: #ffffff;
  --surface-muted: #f1ede7;
  --border: #e4ded6;
  --border-strong: #cfc6bb;
  --muted: #6b6b6b;
  --muted-strong: #4a4a4a;
  --accent-primary: #e16f47;
  --accent-secondary: #2961a1;
}

html[data-theme='dark'] {
  color-scheme: dark;

  --background: #0b0b0b;
  --foreground: #f5f2ee;
  --surface: #141210;
  --surface-muted: #1c1916;
  --border: #2c2824;
  --border-strong: #3b3530;
  --muted: #b5ada4;
  --muted-strong: #d4ccc3;
  --accent-primary: #e16f47;
  --accent-secondary: #2961a1;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: var(--font-geist-sans);
}

.bg-base {
  background-color: var(--background);
}

.surface {
  background-color: var(--surface);
}

.border-subtle {
  border-color: var(--border);
}

.border-strong {
  border-color: var(--border-strong);
}

.btn-primary {
  background-color: var(--accent-primary);
  color: white;
}
```

---

## Responsive Breakpoints

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm:` | 640px | Small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Desktops |
| `xl:` | 1280px | Large desktops |

### Responsive Patterns

```tsx
{/* Mobile: stack, Desktop: side-by-side */}
<div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
  {/* Content */}
</div>

{/* Mobile: full width, Tablet: 2 columns */}
<div className="grid gap-4 md:grid-cols-2">
  {/* Items */}
</div>

{/* Responsive padding */}
<div className="px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
  {/* Content */}
</div>
```

---

## Accessibility Guidelines

### Focus States
All interactive elements must have visible focus states:
```css
focus:border-[color:var(--accent-secondary)]
focus:outline-none
focus:ring-2
focus:ring-accent-secondary
focus:ring-offset-2
```

### ARIA Labels
```tsx
<button aria-label="Close dialog">
  ×
</button>

<input aria-describedby="helper-text" />
<p id="helper-text" className="text-xs text-muted">
  Helper text
</p>
```

### Keyboard Navigation
- All interactive elements should be keyboard accessible
- Use semantic HTML (`<button>`, `<a>`, `<nav>`, etc.)
- Maintain logical tab order

### Color Contrast
- Light theme: Minimum 4.5:1 for normal text
- Dark theme: Minimum 4.5:1 for normal text
- Use `text-strong` for primary text
- Use `text-muted` for secondary text
- Use `text-subtle` for tertiary text

---

## Best Practices

### Do's ✅
- Use semantic HTML elements
- Maintain consistent spacing using Tailwind's spacing scale
- Use CSS variables for colors to support theming
- Implement smooth transitions on interactive elements
- Test both light and dark themes
- Ensure keyboard navigation works
- Use descriptive class names and comments

### Don'ts ❌
- Avoid hardcoded color values (use CSS variables)
- Don't skip responsive design considerations
- Avoid inconsistent border radius values
- Don't use arbitrary pixel values outside the design system
- Avoid mixing font families
- Don't forget disabled and loading states

---

## Quick Reference

### Common Class Combinations

**Card:**
```
rounded-3xl border border-subtle bg-[color:var(--surface)] p-6 shadow-sm
```

**Primary Button:**
```
btn-primary rounded-full px-6 py-3 text-sm font-semibold transition-all hover:brightness-95 disabled:opacity-60
```

**Input Field:**
```
w-full rounded-2xl border border-subtle bg-transparent px-4 py-3 text-sm text-strong placeholder-muted focus:border-[color:var(--accent-secondary)] focus:outline-none
```

**Section Container:**
```
mx-auto max-w-5xl px-6 py-10
```

**Two-Column Layout:**
```
grid gap-6 lg:grid-cols-[1.1fr_1fr] xl:gap-8
```

---

## Example: Complete Form Section

```tsx
<section className="rounded-3xl border border-subtle bg-[color:var(--surface)] p-6 shadow-sm">
  <h2 className="mb-6 text-2xl font-semibold text-strong">
    Form Title
  </h2>

  <form className="flex flex-col gap-4">
    {/* Input field */}
    <div>
      <label className="mb-2 block text-sm font-medium text-subtle">
        Full Name
      </label>
      <input
        type="text"
        placeholder="Enter name..."
        className="w-full rounded-2xl border border-subtle bg-transparent px-4 py-3 text-sm text-strong placeholder-muted focus:border-[color:var(--accent-secondary)] focus:outline-none"
      />
    </div>

    {/* Select field */}
    <div>
      <label className="mb-2 block text-sm font-medium text-subtle">
        Department
      </label>
      <select className="w-full rounded-2xl border border-subtle bg-transparent px-4 py-3 text-sm text-strong focus:border-[color:var(--accent-secondary)] focus:outline-none">
        <option>Engineering</option>
        <option>Design</option>
        <option>Marketing</option>
      </select>
    </div>

    {/* Actions */}
    <div className="mt-4 flex gap-3">
      <button
        type="submit"
        className="btn-primary rounded-full px-6 py-3 text-sm font-semibold transition-all hover:brightness-95"
      >
        Submit
      </button>
      <button
        type="button"
        className="rounded-full border border-subtle px-4 py-2 text-sm font-semibold text-subtle transition-all hover:border-strong hover:text-strong"
      >
        Cancel
      </button>
    </div>
  </form>
</section>
```

---

## Support

For questions or clarifications about this style guide:
- Review the source code in `/src/app/`
- Check `globals.css` for theme variables
- Refer to component implementations in `/src/app/(app)/`

**Version:** 1.0
**Last Updated:** January 2026
