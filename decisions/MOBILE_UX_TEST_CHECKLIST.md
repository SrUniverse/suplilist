# Mobile UX Testing Checklist

## 📱 Device Testing
- [ ] Test on iPhone SE (375x667)
- [ ] Test on iPhone 12 (390x844)
- [ ] Test on iPhone 14 Pro (393x852)
- [ ] Test on Samsung Galaxy A12 (360x800)
- [ ] Test on iPad (768x1024)

## 🔄 Orientation Testing

### Portrait Mode
- [ ] All content readable
- [ ] No horizontal scroll
- [ ] Touch targets visible and clickable (48px minimum)
- [ ] Buttons/inputs properly sized
- [ ] Text not truncated

### Landscape Mode
- [ ] Header/footer properly sized
- [ ] Navigation accessible
- [ ] Form inputs visible above keyboard
- [ ] Gap spacing reduced appropriately
- [ ] No weird layout shifts

## ⌨️ Keyboard Testing (Virtual)
- [ ] Input focus scrolls into view
- [ ] Keyboard doesn't cover inputs
- [ ] Bottom nav hides when keyboard visible
- [ ] Form submission works
- [ ] Blur dismisses keyboard properly

## 👆 Touch Feedback Testing
- [ ] Buttons have :active state visual feedback
- [ ] Tab buttons show active state clearly
- [ ] Cards have hover/active feedback
- [ ] No 300ms delay on interactions
- [ ] Feedback is immediate (< 100ms)

## 🎨 Visual/Color Testing
- [ ] Dark mode colors correct
- [ ] Light mode colors correct
- [ ] Focus outline visible (2px brand color)
- [ ] Error states clearly marked (red)
- [ ] Success states clearly marked (green)
- [ ] Contrast meets WCAG AA (4.5:1 text)

## ♿ Accessibility Testing
- [ ] Tab through all interactive elements
- [ ] Focus order makes sense
- [ ] All buttons have `:focus-visible` state
- [ ] Form labels associated with inputs
- [ ] Error messages linked to inputs
- [ ] Skip to content link works
- [ ] Screen reader friendly

## 📝 Form Testing
- [ ] Input min-height 48px
- [ ] Font-size 16px (prevent iOS zoom)
- [ ] Placeholder text visible
- [ ] Autofill styling matches theme
- [ ] Password managers work
- [ ] Focus ring visible
- [ ] Error/success states visible

## 🔍 Text & Overflow Testing
- [ ] No horizontal scroll
- [ ] Long titles wrap properly
- [ ] Line-height readable (1.3-1.5)
- [ ] Text doesn't overlap
- [ ] Word-break works on long words
- [ ] Hyphens appear correctly

## 📊 Performance Testing
- [ ] Page loads quickly (< 3s)
- [ ] Scrolling smooth (60fps)
- [ ] Animations smooth
- [ ] No jank or stuttering
- [ ] Images load properly
- [ ] Network activity reasonable

## 🌐 Network Testing
- [ ] Works offline (cached)
- [ ] Offline notification shows
- [ ] Online notification shows
- [ ] Data persists offline
- [ ] Sync works when online

## 🎭 Dark Mode Testing
- [ ] All colors visible in dark mode
- [ ] No contrast issues
- [ ] Autofill readable
- [ ] Focus rings visible
- [ ] Modals properly styled

## ⚡ Loading State Testing
- [ ] Skeleton screens appear
- [ ] Smooth transitions
- [ ] No flash of unstyled content
- [ ] Animations smooth on slow networks

## 📦 Modal Testing
- [ ] Responsive on mobile
- [ ] Close button accessible (48px)
- [ ] Scrollable if too tall
- [ ] Focus trap works
- [ ] Backdrop dismissal works
- [ ] Proper z-index stacking

## 🖼️ Image Testing
- [ ] Images load properly
- [ ] Responsive sizing
- [ ] No unnecessary overflow
- [ ] Lazy loading works
- [ ] Proper aspect ratio

## 🔗 Link/Button Testing
- [ ] Minimum 44x44px touch target
- [ ] Proper spacing between targets
- [ ] Link underlines clear
- [ ] Hover state visible (if applicable)
- [ ] Active state clear

## 📋 Navigation Testing
- [ ] Mobile nav works
- [ ] Bottom nav accessible
- [ ] Breadcrumbs working
- [ ] Back button functional
- [ ] Navigation mobile-optimized

## 🎬 Animation Testing
- [ ] Smooth transitions
- [ ] Respect `prefers-reduced-motion`
- [ ] No infinite loops
- [ ] Animations serve purpose
- [ ] Performance good on slow devices

## ✅ Final Checks
- [ ] No console errors
- [ ] No console warnings (except analytics)
- [ ] No network errors
- [ ] All features functional
- [ ] No layout shifts
- [ ] Good performance score

---

## Lighthouse Scoring Targets
- **Performance**: > 90
- **Accessibility**: > 95
- **Best Practices**: > 90
- **SEO**: > 90

## Notes
- Test on real devices when possible
- Test on slow network (throttle to 3G)
- Test with VoiceOver/TalkBack enabled
- Test on notched devices (iPhone 12+)
