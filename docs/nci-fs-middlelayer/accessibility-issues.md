# Swagger UI Accessibility Issues

This table provides the accessibility issues found in an audit of the Swagger UI documentation created for the Forest Service Middle-Layer ePermit API. These issues are excerpted from the [full accessibility report](accessibility_report.pdf). That report provides comprehensive results of testing the Swagger 2.0 API documentation against the Web Content Accessibility Standards (WCAG) 2.0, levels A and AA, adopted by the U.S. Access Board as standards for Section 508 compliance. 

The table below references the relevant WCAG 2.0 standards by number and includes their corresponding descriptions, abbreviated in some cases. The issues describe the associated accessibility barrier (i.e., the standards nonconformance) found in testing.  

| Standard | Description                                                                                                                                                                                                                                                                                                                                                                                                      | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1.1.1    | Non-text Content: All non-text content that is presented to the user has a text alternative that serves the equivalent purpose . . . (Level A).                                                                                                                                                                                                                                                                  | The “VALID” linked image at bottom requires alt text describing the purpose or target (e.g., `alt='validator'`).                                                                                                                                                                                                                                                                                                                                                                    |
| 1.3.1    | Info and Relationships: Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text. (Level A)                                                                                                                                                                                                                                           | The first two headings on the page, “US Forest Service ePermit Middlelayer API” and “API Documentation for Developers,” are not marked up semantically in HTML to indicate their structure as headings.                                                                                                                                                                                                                                                                             |
| 1.4.3    | Contrast (Minimum): The visual presentation of text and images of text has a contrast ratio of at least 4.5:1 . . . (Level AA)                                                                                                                                                                                                                                                                                   | The following text has an insufficient color contrast ratio (i.e., less than 4.5: 1): 1) White “Forest Service …” heading text at top, 2) The white POST text next to each POST route, 3) The green summary text to the right of each POST route, 4) The white “VALID” text at bottom, 5) The gray (required) placeholder text in the parameters fields, 6) The gray headings (e.g., “Authorization Request”) above each route (note, however, that their black hover state is OK). |
| 2.1.1    | Keyboard: All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes, except where the underlying function requires input that depends on the path of the user's movement and not just the endpoints. (Level A)                                                                                                                      | Scrolling in the example value fields is not possible with the keyboard. These fields do not receive keyboard focus. For the noncommercial and temp outfitters POST routes, it is not possible to select the example value to populate the body text area.                                                                                                                                                                                                                          |
| 2.4.7    | Focus Visible: Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible. (Level AA)                                                                                                                                                                                                                                                                            | 1) The “Authorization Request” link to the right of the `/auth` route is focusable but lacks a visible focus indicator. 2) For the noncommercial and temp-outfitters POST routes, the example value field is not focusable with the keyboard.                                                                                                                                                                                                                                       |
| 4.1.1    | Parsing: In content implemented using markup languages, elements have complete start and end tags, elements are nested according to their specifications, elements do not contain duplicate attributes, and any IDs are unique, except where the specifications allow these features. (Level A)                                                                                                                  | There is an extra `<html>` start tag without an end tag.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 4.1.2    | Name, Role, Value: For all user interface components (including but not limited to: form elements, links and components generated by scripts), the name and role can be programmatically determined; states, properties, and values that can be set by the user can be programmatically set; and notification of changes to these items is available to user agents, including assistive technologies. (Level A) | Notification of changes to content (e.g., the response after selecting “Try it out!”) is not conveyed to assistive technology.                                                                                                                                                                                                                                                                                                                                                      |