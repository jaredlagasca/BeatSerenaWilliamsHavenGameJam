# Design System — Beat Serena Williams

## Aesthetic Direction
**1990s Grand Slam Broadcast × Vintage Sports Poster × Backroom Card Table**
- Flat, high-contrast, tactile print/arcade aesthetic.
- Zero neon glows, zero glassmorphism (`backdrop-filter`), zero generic dark-mode indigo-to-magenta gradients.
- Crisp `2px` solid ink borders (`#141413`) with hard `4px 4px 0 #141413` offset shadows that physically depress (`translate(2px, 2px)`) on click.

## Color Tokens
- **Paper / Chalk**: `#f4efe6` (primary light surface, cards, posters)
- **Warm Cream**: `#ebe3d3` (secondary surface, recessed panels)
- **Ink Black**: `#141413` (borders, primary text on light, hard shadows)
- **Championship Forest**: `#164a31` (outer stadium / app backdrop)
- **Tournament Blue**: `#1f4e79` (inner hard court)
- **Court Clay / Terracotta**: `#c84b31` (danger, defeat, Serena accent)
- **Trophy Gold**: `#d99b16` (bankroll, casino chips, highlights)
- **Felt Green**: `#134e32` (blackjack table felt)

## Typography
- **Display / Broadcast**: `'Barlow Condensed', 'Impact', sans-serif` (uppercase, tight tracking, weights 700–900)
- **UI / Monospace**: `'IBM Plex Mono', 'Courier New', monospace` (tabular numbers, cash, keyboard hints, micro-copy)

## Juice & Motion
- **Buttons**: `transition: transform 60ms ease, box-shadow 60ms ease`; active state shifts `+2px, +2px` and reduces shadow to `2px 2px 0`.
- **Canvas**: Subtle camera lerp following ball (`±12px`), screen shake on smashes/net-hits, ball squash-and-stretch on bounce, and crisp UI audio feedback.
