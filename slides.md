---
title: "Lesson 2: Grouping Numbers Together"
layout: cover
---

# Vectors in R

Grouping Numbers Together

Bean There Cafe - Weekly Sales Tracker

---
layout: section
---

## What You'll Learn

- Why we need to group numbers together
- The `c()` function to create collections
- The `length()` function to count elements
- Real-world project: Bean There Cafe Weekly Sales Tracker

---

## The Problem - Too Many Variables

Sarah has a full week of sales data. Does she need 7 separate variables?

```r {1|2|3|4|5|6|7|all}
monday_sales <- 2840
tuesday_sales <- 3200
wednesday_sales <- 2900
thursday_sales <- 3500
friday_sales <- 4100
saturday_sales <- 3800
sunday_sales <- 3600
```

7 variables to manage, hard to calculate across all days, and what about 30 days... or 365?

> There must be a better way to keep these numbers together!

---
layout: section
---

## A New Tool

The `c()` function - **c** stands for **combine**

---
layout: two-cols
---

## The `c()` Function

Combines multiple values into **one group**.

**Pattern:**

```r
c(value1, value2, value3)
```

All values separated by commas, stored in a single variable.

::right::

### First Example

```r {1|2|all}
my_numbers <- c(5, 8, 3)
print(my_numbers)
```

**Output:**

```
[1] 5 8 3
```

Three numbers stored together in one variable!

---
layout: code
---

## Sarah's Weekly Sales Vector

```r {1-2|4|all}
# Bean There Cafe - Full week (Mon-Sun)
weekly_sales <- c(2840, 3200, 2900, 3500, 4100, 3800, 3600)

print(weekly_sales)
```

**Output:**

```
[1] 2840 3200 2900 3500 4100 3800 3600
```

> One variable instead of seven - so much cleaner!

---
layout: center
---

## What is a Vector?

A **collection of values** stored together **in order**

Think of it like a row in a spreadsheet, or a train with numbered cars

```r
weekly_sales <- c(2840, 3200, 2900, 3500, 4100, 3800, 3600)
```

This vector has **7 elements** - the 7 numbers inside it

---
layout: two-cols
---

## The Comma Rule

Inside `c()`, you **must** separate values with commas.

### Correct

```r
prices <- c(3.50, 4.50, 5.00)
```

### Wrong

```r
prices <- c(3.50 4.50 5.00)
```

::right::

### What Happens Without Commas

```
Error: unexpected numeric constant
```

Without commas, R thinks you're writing one giant confusing number!

> Commas are like saying "and" - 3.50 **and** 4.50 **and** 5.00

---

## Vectors Can Hold Any Amount of Numbers

```r {1-2|4-5|7-10|all}
# Small - just 2 numbers
weekend_sales <- c(3800, 3600)

# Medium - 5 numbers
prices <- c(3.50, 4.50, 5.00, 4.00, 3.00)

# Large - as many as you want
monthly_sales <- c(2840, 3200, 2900, 3500, 4100,
  3800, 3600, 2950, 3100, 3350, 4200, 3900,
  3700, 3850, 4150, 3950, 3650, 3450)
```

No matter how many values - the pattern is always the same!

---
layout: section
---

## Another New Tool

The `length()` function - counts how many elements are in a vector

---
layout: two-cols
---

## The `length()` Function

Counts how many elements are in a vector.

**Pattern:**

```r
length(your_vector)
```

Like asking: *"How many items are in this list?"*

::right::

### Simple Example

```r {1|2-3|all}
test_numbers <- c(5, 8, 3)
count <- length(test_numbers)
print(count)
```

**Output:**

```
[1] 3
```

It counted 3 elements!

---
layout: code
---

## Using `length()` with Sarah's Data

Sarah wants to verify she has all 7 days:

```r {1-2|4-5|all}
# Sarah's weekly sales
weekly_sales <- c(2840, 3200, 2900, 3500, 4100, 3800, 3600)

days <- length(weekly_sales)
print(days)
```

**Output:**

```
[1] 7
```

> Use `length()` to make sure you didn't miss any days!

---
layout: two-cols
---

## Combining Vectors

You can use `c()` to combine **existing vectors** together!

```r {1-2|4-5|7-8|all}
# Weekday sales (Mon-Fri)
weekday_sales <- c(2840, 3200, 2900, 3500, 4100)

# Weekend sales (Sat-Sun)
weekend_sales <- c(3800, 3600)

# Combine into full week
full_week <- c(weekday_sales, weekend_sales)
```

::right::

### Result

```r
print(full_week)
```

```
[1] 2840 3200 2900 3500 4100 3800 3600
```

- First `c()` created 5 weekday values
- Second `c()` created 2 weekend values
- Third `c()` combined both into one 7-element vector

---
layout: code
---

## Adding to an Existing Vector

```r {1-3|5-7|all}
# Start with 3 days
sales <- c(2840, 3200, 2900)
print(sales)  # [1] 2840 3200 2900

# Add two more days to the end
sales <- c(sales, 3500, 4100)
print(sales)  # [1] 2840 3200 2900 3500 4100
```

We combined the old `sales` (3 values) with 2 new numbers, then stored it back in `sales`.

> Perfect for adding new days as they come in!

---
layout: section
---

## Vector Math

R's superpower - calculations on **entire vectors** at once

---
layout: code
---

## Vectorization in Action

```r {1-2|4-5|7-8|all}
# Quantities sold over 3 days
quantities <- c(45, 52, 38)

# Price per item
price <- 3.50

# Revenue for EACH day - calculated all at once!
revenues <- quantities * price
```

```r
print(revenues)  # [1] 157.5 182.0 133.0
```

- 45 * 3.50 = 157.5
- 52 * 3.50 = 182.0
- 38 * 3.50 = 133.0

> R multiplied **each** quantity by 3.50 automatically - this is **vectorization**!

---
layout: two-cols
---

## Common Mistakes

### Forgetting `c()`

```r
# Wrong
sales <- (2840, 3200, 2900)
# Error: unexpected ','
```

```r
# Correct
sales <- c(2840, 3200, 2900)
```

The `c` is **required** - c for combine!

::right::

### Forgetting Commas

```r
# Wrong
sales <- c(2840 3200 2900)
# Error: unexpected numeric constant
```

```r
# Correct
sales <- c(2840, 3200, 2900)
```

Commas tell R *"this is a new value"*.

---
layout: code
---

## Real-World Example - Three Products

```r {1-2|4-5|7-8|10-12|all}
# Daily quantities sold for three products (5 days each)
americano_sold <- c(45, 48, 42, 50, 52)

latte_sold <- c(52, 55, 48, 60, 58)

mocha_sold <- c(38, 40, 35, 42, 45)

print(americano_sold)  # [1] 45 48 42 50 52
print(latte_sold)      # [1] 52 55 48 60 58
print(mocha_sold)      # [1] 38 40 35 42 45
```

> Clean, organized data ready for analysis. Each product's week is in one vector!

---
layout: center
---

## Before and After Vectors

**Before** (Lesson 1): Single numbers, separate variables, messy, can't scale

**After** (Lesson 2): Related numbers together, organized, bulk calculations, scales to any size

You've unlocked a major programming concept - **this is the foundation of all data analysis in R!**

---
layout: cover
---

# End of Lesson 2

You now know `c()` to create vectors and `length()` to count elements

Next up: accessing individual elements inside vectors
