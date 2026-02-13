const xlsx = require('xlsx');
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet([
    { Name: "John Doe", Age: 30, City: "New York" },
    { Name: "Jane Smith", Age: 25, City: "London" }
]);
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
xlsx.writeFile(wb, "test.xlsx");
console.log("test.xlsx created");
