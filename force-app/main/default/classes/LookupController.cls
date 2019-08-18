public with sharing class LookupController {

    @AuraEnabled(cacheable=true)
    public static ObjectSchemaWrapper findObjectSchema(String objectApiName, String keyField) {
        
        ObjectSchemaWrapper schemaWrapper = new ObjectSchemaWrapper();
        List<ObjectWrapper> objectWrapperList = new List<ObjectWrapper> {
            new ObjectWrapper('Contact', 'Contact'),
            new ObjectWrapper('Lead', 'Lead')
        };
        schemaWrapper.objectList = objectWrapperList;

        System.debug('schemaWrapper: ' + schemaWrapper);

        return schemaWrapper; 
    }

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

    public class ObjectSchemaWrapper {
        @AuraEnabled public List<ObjectWrapper> objectList {get; set; }
    }
    public class ObjectWrapper {
        @AuraEnabled public String key { get; set; }
        @AuraEnabled public String label { get; set; }
        public ObjectWrapper(String key, String label) {
            this.key = key;
            this.label = label;
        }
    }
}