# Product Context: AI-Powered Purchase Order Classification System

## 1. Purpose of the Project
The primary purpose of this project is to streamline and automate the classification of purchase order (PO) items. Currently, this process might be manual, time-consuming, and prone to inconsistencies. By leveraging automated parsing of item descriptions, the system aims to provide a more efficient, accurate, and standardized way to categorize PO items into a folder-like structure.

## 2. Problems to Solve
- **Manual Classification Overhead**: Reduce the manual effort and time spent on classifying a large volume of PO items.
- **Inconsistent Categorization**: Ensure consistency in how items are categorized, even with variations in item descriptions or new items.
- **Difficult Data Analysis**: Enable easier analysis of purchasing patterns by providing structured, multi-level categories for items.
- **Inefficient Information Retrieval**: Improve the ability to search and find specific POs based on item categories rather than just keywords.
- **Lack of Actionable Insights**: Provide a foundation for deriving actionable insights from purchasing data, such as identifying frequently purchased brands, materials, or common item specifications.

## 3. How It Should Work (User Experience Goals)
- **Intuitive Data Input**: Users should be able to easily trigger the data extraction process by providing necessary parameters (Company ID, date range, item code range).
- **Clear Item Classification**: The system should automatically classify items into a hierarchical folder structure (e.g., Layer 1: General Type, Layer 2: Specific Item), making it easy for users to understand the relationships between items.
- **Interactive Exploration**: The frontend should allow users to navigate through these folder layers in a "Google Drive-like" manner, drilling down from broader categories to specific item types, and then viewing all POs for that item type.
- **Efficient Data Management**: Users should be able to view detailed PO information related to specific item categories (L2 folders), search for items, and filter data effectively.
- **User-Driven Refinement**: Allow users to manually adjust certain fields (`Checklist`, `Keterangan`) to augment the automated classification and add specific notes.
- **Actionable Outputs**: Enable users to export relevant data to Excel/CSV for further analysis or reporting.
- **Insightful Dashboard**: Provide a mini-dashboard offering quick insights into PO data (e.g., total POs, total amount, number of categories).
- **Seamless New Item Classification**: The system should offer an easy way to classify new, unseen items using the established parsing logic.
