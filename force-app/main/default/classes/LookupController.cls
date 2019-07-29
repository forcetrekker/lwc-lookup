public with sharing class LookupController {

    @AuraEnabled(cacheable=true)
    public static List<SObject> findContacts(String searchKey, String objectApiName, String keyField) {

        System.debug('searchKey: ' + searchKey);
        List<SObject> records =  new List<SObject>();
        if(String.isEmpty(searchKey)) {
            return records;
        }
        String key = '%' + searchKey + '%';
        String soqlTemplate = 'SELECT Id, {0} FROM {1} WHERE {0} LIKE \'\'{2}\'\' ORDER BY {0} LIMIT 10';
        String soql = String.format(soqlTemplate, new List<String> {keyField, objectApiName, key});
        System.debug('soql: ' + soql);
        records = Database.query(soql);
        System.debug('records: ' + records);
        return records;
    }
}