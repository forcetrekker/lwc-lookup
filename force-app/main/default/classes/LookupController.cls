public with sharing class LookupController {

    @AuraEnabled(cacheable=true)
    public static List<SObject> findRecords(String searchKey, String objectApiName, String keyField, String additionalField) {

        System.debug('searchKey: ' + searchKey);
        List<SObject> records =  new List<SObject>();
        if(String.isEmpty(searchKey)) {
            return records;
        }

        Set<String> fieldsSet = new Set<String>{'Id'};

        if(String.isNotEmpty(keyField)) {
            fieldsSet.add(keyField);
        }
        if(String.isNotEmpty(additionalField)) {
            fieldsSet.add(additionalField);
        }

        List<String> fieldsList = new List<String>();
        fieldsList.addAll(fieldsSet);
        String fieldsString = String.join(fieldsList, ', ');

        String key = '%' + searchKey + '%';
        String soqlTemplate = 'SELECT {0} FROM {1} WHERE {2} LIKE \'\'{3}\'\' ORDER BY {2} LIMIT 10';
        String soql = String.format(soqlTemplate, new List<String> {fieldsString, objectApiName, keyField, key});
        System.debug('soql: ' + soql);
        records = Database.query(soql);
        System.debug('records: ' + records);
        return records;
    }
}