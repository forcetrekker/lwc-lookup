public with sharing class LookupController {

    @AuraEnabled(cacheable=true)
    public static List<SObject> findRecords(String searchKey, 
        String objectApiName, 
        String keyField, 
        String additionalField,
        String selectedRecords) {

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

        Set<Id> setSelectedRecords = (Set<Id>) JSON.deserialize(selectedRecords, Set<Id>.class);

        String key = '%' + searchKey + '%';

        String whereClause = 'WHERE ' + keyField + ' LIKE \''+ key +'\'';
        if(!setSelectedRecords.isEmpty()) {
            whereClause += ' AND Id Not IN: setSelectedRecords';
        }

        String soqlTemplate = 'SELECT {0} FROM {1} {2} ORDER BY {3} LIMIT 10';
        String soql = String.format(soqlTemplate, new List<String> {fieldsString, objectApiName, whereClause, keyField});
        System.debug('soql: ' + soql);
        records = Database.query(soql);
        System.debug('records: ' + records);
        return records;
    }
}