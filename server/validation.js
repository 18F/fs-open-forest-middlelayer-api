/*

  ___ ___       ___               _ _       _   ___ ___ 
 | __/ __|  ___| _ \___ _ _ _ __ (_) |_    /_\ | _ \_ _|
 | _|\__ \ / -_)  _/ -_) '_| '  \| |  _|  / _ \|  _/| | 
 |_| |___/ \___|_| \___|_| |_|_|_|_|\__| /_/ \_\_| |___|

*/

//*******************************************************************

'use strict';

//*******************************************************************
// required modules
const path = require('path');
const Validator = require('jsonschema').Validator;
const include = require('include')(__dirname);

//*******************************************************************
// other files

const errors = require('./patternErrorMessages.json');

const v = new Validator();

const fileMimes = [
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/msword',
	'text/rtf',
	'application/pdf'
];

function digitCheck(input, num){

	let valid = true;
	
	if (typeof input === 'number'){

		const inputStr = input + '';

		if (!inputStr.match(new RegExp(`^[0-9]{${num}}$`))){

			valid = false;

		}

	}

	return valid;

}

function areaCodeFormat(input){

	return digitCheck(input, 3);

}
function phoneNumberFormat(input){

	return digitCheck(input, 7);

}

/**
 * Removes 'instance' from prop field of validation errors. Used to make fields human readable
 * 
 * @param {string} prop - Prop field from validation error
 * @return {string}
 */
function removeInstance(prop){

	let fixedProp = '';

	if (prop.indexOf('.') !== -1){

		fixedProp = prop.substring((prop.indexOf('.') + 1), (prop.length));

	}

	return fixedProp;

}

/**
 * Combines property and argument fields, if property exists, for missing field errors
 *
 * @param  {string}
 * @param  {string}
 * @return {string}
 */
function combinePropArgument(property, argument){

	let field;
	if (property.length > 0){

		field = `${property}.${argument}`;

	}
	else {

		field = argument;

	}

	return field;

}
/**
 * Creates error object which can be read by error message building function
 * 
 * @param {string} field
 * @param {string} errorType
 * @param {string} expectedFieldType
 * @param {string} enumMessage
 * @param {string} dependency
 * @param {array[string]} anyOfFields
 * 
 * @return Error object
 */
function makeErrorObj(field, errorType, expectedFieldType, enumMessage, dependency, anyOfFields){
	const output = {
		field,
		errorType,
		expectedFieldType,
		enumMessage,
		dependency,
		anyOfFields
	};
	let key;
	for (key in output){
		if (output[key] === null){
			delete output[key];
		}
	}
	return output;
}

let requiredFields = [];
/** Traverses schema object in search of all fields listed as required. Stores all fields in requiredFiles array. 
 * @param  {Object} schema - schema to traverse in search for all required fields
 */
function getAllRequired(schema){
	const keys = Object.keys(schema);
	keys.forEach((key)=>{
		switch (key){
		case 'allOf':
			schema.allOf.forEach((sch)=>{
				getAllRequired(sch);
			});
			break;
		case 'properties':
			getAllRequired(schema.properties);
			break;
		case 'required':
			requiredFields = requiredFields.concat(schema.required);
		}
	});
}
/** Traverses through schema to find field specified. Once found it executes a function on that field in the schema.
 * @param  {Object} schema - schema to look for field in
 * @param  {Array[String]} field - Array containing the path to the field to find
 * @param  {Function} func - Function to be run on the schema of field
 */
function findField(schema, field, func){
	const fieldCopy = JSON.parse(JSON.stringify(field));
	const schemaKeys = Object.keys(schema);
	schemaKeys.forEach((key)=>{
		if (key === fieldCopy[0]){
			if (fieldCopy.length === 1){
				func(schema[key]);
			}
			else {
				fieldCopy.shift();
				findField(schema[key], fieldCopy, func);
			}
		}
		else {
			switch (key){
			case 'allOf':
			case 'oneOf':
				schema[key].forEach((sch)=>{
					findField(sch, fieldCopy, func);
				});
				break;
			case 'properties':
				findField(schema.properties, fieldCopy, func);
				break;
			}
		}
	});
}

function handleMissingError(output, result, counter, schema){
	requiredFields = [];
	const property = removeInstance(result[counter].property);
	const field = combinePropArgument(property, result[counter].argument);

	output.errorArray.push(makeErrorObj(field, 'missing'));
	findField(schema, field.split('.'), getAllRequired);
	for (const i in requiredFields){
		requiredFields[i] = `${field}.${requiredFields[i]}`;
	}
	requiredFields.forEach((requiredField)=>{
		output.errorArray.push(makeErrorObj(requiredField, 'missing'));
	});
}

function handleTypeError(output, result, counter){

	const expectedType = result[counter].argument[0];
	const property = removeInstance(result[counter].property);
	output.errorArray.push(makeErrorObj(property, 'type', expectedType));

}

function handleFormatError(output, result, counter){

	const field = `${removeInstance(result[counter].property)}`;
	output.errorArray.push(makeErrorObj(field, 'format'));

}

function handleEnumError(output, result, counter){

	const property = removeInstance(result[counter].property);
	output.errorArray.push(makeErrorObj(property, 'enum', null, result[counter].message));

}

function getDependency(result, counter){

	const stackMessage = result[counter].stack;
	const dependency = stackMessage.split(' property ')[1].split(' not ')[0];
	return dependency;

}

function handleDependencyError(output, result, counter){

	const error = result[counter];
	const dependentField = removeInstance(error.argument);
	const schemaPath = removeInstance(error.property);
	const dependency = `${schemaPath}.${getDependency(result, counter)}`;
	output.errorArray.push(makeErrorObj(dependentField, 'dependencies', null, null, dependency));

}

/**
 * Creates error object for errors resulting from an anyOf section of the validation schema
 *
 * @param {object} errorTracking - Error object containing all error to report and the error message to deliver.
 * @param {array} errorTracking.errorArray - Array contain all errors to report to user.
 * @param {array} result - Array of errors found during validation.
 * @param {integer} counter - Position in result that the current error being handled is.
 * 
 * @affects errorTracking.errorArray 
 */
function handleAnyOfError(errorTracking, result, counter){

	const error = result[counter];
	const property = removeInstance(error.property);
	const requiredOptions = [];
	error.schema.anyOf.forEach((fieldObj)=>{
		requiredOptions.push(combinePropArgument(property, fieldObj.required[0]));
	});
	errorTracking.errorArray.push(makeErrorObj(null, 'anyOf', null, null, null, requiredOptions));
	
}

/** Get the schema to be used for validating user input
 * @param  {Object} pathData - All data from swagger for the path that has been run
 * @return {Object} schemas - fullSchema is the full validation schemas for all permit types. schemaToUse is the validation schema for this route
 */
function getValidationSchema(pathData){
	const fileToGet = `server/${pathData.validation.$ref.split('#')[0]}`;
	const schemaToGet = pathData.validation.$ref.split('#')[1];
	const applicationSchema = include(fileToGet);
	return {
		'fullSchema':applicationSchema,
		'schemaToUse':applicationSchema[schemaToGet]
	};
}

/** Validates the fields in user input
 * @param  {Object} body - Input from user to be validated
 * @param  {Object} pathData - All data from swagger for the path that has been run
 * @return {Array[{ValidationError}]} - All field errors from validation
 */
function validateBody(body, pathData){
	const schema = getValidationSchema(pathData);
	const applicationSchema = schema.fullSchema;
	const schemaToUse = schema.schemaToUse;
	let key;
	for (key in applicationSchema){
		v.addSchema(applicationSchema[key], key);
	}
	v.customFormats.areaCodeFormat = areaCodeFormat;
	v.customFormats.phoneNumberFormat = phoneNumberFormat;
	const val = v.validate(body, schemaToUse);
	const error = val.errors;
	return error;
}

/** Processes ValidationError into ErrorObj, extracting the info needed to create an error message
 * @param  {Array[{ValidationError}]} - All field errors from validation
 * @param  {Array[{ErrorObjs}]} - Array to store processed ErrorObjs in
 */
function processErrors(errors, processedErrors, schema){
	const length = errors.length;
	let counter;
	for (counter = 0; counter < length; counter++){

		switch (errors[counter].name){
		case 'required':
			handleMissingError(processedErrors, errors, counter, schema);
			break;
		case 'type':
			handleTypeError(processedErrors, errors, counter);
			break;
		case 'format':
		case 'pattern':
			handleFormatError(processedErrors, errors, counter);
			break;
		case 'enum':
			handleEnumError(processedErrors, errors, counter);
			break;
		case 'dependencies':
			handleDependencyError(processedErrors, errors, counter);
			break;
		case 'anyOf':
			handleAnyOfError(processedErrors, errors, counter);
			break;
		}
	}
}

function makeFieldReadable(input){

	return input
	.replace(/([A-Z])/g, ' $1')
	.replace(/^./, function(str){
		return str.toUpperCase();
	})
	.replace('Z I P', 'Zip')
	.replace('U R L', 'URL');

}

function makePathReadable(input){

	if (typeof input === 'string'){
		const parts = input.split('.');
		const readableParts = [];
		let readablePath = '';
		parts.forEach((field)=>{
			readableParts.push(makeFieldReadable(field));
		});
		readablePath = readableParts.shift();
		readableParts.forEach((part)=>{
			readablePath = `${readablePath}/${part}`;
		});
		return readablePath;
	}
	else {
		return false;
	}

}

function buildFormatErrorMessage(fullPath){
	const field = fullPath.substring(fullPath.lastIndexOf('.') + 1);
	const readablePath = makePathReadable(fullPath);
	const errorMessage = `${readablePath}${errors[field]}`;
	return errorMessage;

}

/**
 * Creates error message for anyOf errors
 * 
 * @param  {array[string]} anyOfFields - list of fields, at least one being required.
 * @return {string}
 */
function makeAnyOfMessage(anyOfFields){
	if (anyOfFields){
		let output, count = 1;
		const length = anyOfFields.length;
		output = `${makePathReadable(anyOfFields[0])}`;
		while (count < length) {
			const field = anyOfFields[count];
			output = `${output} or ${makePathReadable(field)}`;
			count ++;
		}
		return output;
	}
	else {
		return false;
	}
}

function concatErrors(errorMessages){

	let output = '';
	errorMessages.forEach((message)=>{
		output = `${output}${message} `;
	});
	output = output.trim();
	return output;
}

function generateFileErrors(output, error, messages){
	const reqFile = `${makePathReadable(error.field)} is a required file.`;
	const small = `${makePathReadable(error.field)} cannot be an empty file.`;
	const large = `${makePathReadable(error.field)} cannot be larger than ${error.expectedFieldType} MB.`;
	let invExt, invMime;
	if (typeof(error.expectedFieldType) !== 'undefined' && error.expectedFieldType.constructor === Array){
		invExt = `${makePathReadable(error.field)} must be one of the following extensions: ${error.expectedFieldType.join(', ')}.`;
		invMime = `${makePathReadable(error.field)} must be one of the following mime types: ${error.expectedFieldType.join(', ')}.`;
	}

	switch (error.errorType){
	case 'requiredFileMissing':
		messages.push(reqFile);
		error.message = reqFile;
		break;
	case 'invalidExtension':
		messages.push(invExt);
		error.message = invExt;
		break;
	case 'invalidMime':
		messages.push(invMime);
		error.message = invMime;
		break;
	case 'invalidSizeSmall':
		messages.push(small);
		error.message = small;
		break;
	case 'invalidSizeLarge':
		messages.push(large);
		error.message = large;
		break;
	}
}

function generateErrorMesage(output){

	let errorMessage = '';
	const messages = [];
	output.errorArray.forEach((error)=>{

		const missing = `${makePathReadable(error.field)} is a required field.`;
		const type = `${makePathReadable(error.field)} is expected to be type '${error.expectedFieldType}'.`;
		const enumMessage = `${makePathReadable(error.field)} ${error.enumMessage}.`;
		const dependencies = `Having ${makePathReadable(error.field)} requires that ${makePathReadable(error.dependency)} be provided.`;
		const anyOf = `Either ${makeAnyOfMessage(error.anyOfFields)} is a required field.`;

		switch (error.errorType){
		case 'missing':
			messages.push(missing);
			error.message = missing;
			break;
		case 'type':
			messages.push(type);
			error.message = type;
			break;
		case 'format':
		case 'pattern':
			messages.push(buildFormatErrorMessage(error.field));
			error.message = buildFormatErrorMessage(error.field);
			break;
		case 'enum':
			messages.push(enumMessage);
			error.message = enumMessage;
			break;
		case 'dependencies':
			messages.push(dependencies);
			error.message = dependencies;
			break;
		case 'anyOf':
			messages.push(anyOf);
			error.message = anyOf;
			break;
		default:
			generateFileErrors(output, error, messages);
			break;
		}
	});
	errorMessage = concatErrors(messages);
	return errorMessage;

}

function checkForFilesInSchema(schema, toCheck){
	
	const keys = Object.keys(schema);
	keys.forEach((key)=>{
		switch (key){
		case 'allOf':
			schema.allOf.forEach((sch)=>{
				checkForFilesInSchema(sch, toCheck);
			});
			break;
		case 'properties':
			checkForFilesInSchema(schema.properties, toCheck);
			break;
		default:
			if (schema[key].type === 'file'){
				const obj = {};
				obj[key] = schema[key];
				toCheck.push(obj);
			}
			else if (schema[key].type === 'object'){
				checkForFilesInSchema(schema[key], toCheck);
			}
			break;
		}
	});
}

function getFileInfo(file, constraints){
	const uploadFile = {};
	const uploadField = Object.keys(constraints)[0];
	if (file){
		const filename = path.parse(file[0].originalname).name;

		uploadFile.file = file[0];
		uploadFile.originalname = uploadFile.file.originalname;
		uploadFile.filetype = Object.keys(constraints)[0];
		uploadFile.filetypecode = constraints[uploadFile.filetype].filetypecode;
		uploadFile.ext = path.parse(uploadFile.file.originalname).ext.split('.')[1];
		uploadFile.size = uploadFile.file.size;
		uploadFile.mimetype = uploadFile.file.mimetype;
		uploadFile.encoding = uploadFile.file.encoding;
		uploadFile.buffer = uploadFile.file.buffer;
		uploadFile.filename = uploadField + '-' + filename + '-' + Date.now() + uploadFile.ext;

	}

	return uploadFile;
}

function validateFile(uploadFile, validationConstraints, fileName){

	const fileInfo = getFileInfo(uploadFile, validationConstraints);
	const constraints = validationConstraints[fileName];
	const regex = `(^${constraints.validExtensions.join('$|^')}$)`;
	const errObjs = [];

	if (uploadFile){
		if (uploadFile.ext && !fileInfo.ext.toLowerCase().match(regex)){
			errObjs.push(makeErrorObj(fileInfo.filetype, 'invalidExtension', constraints.validExtensions));
		}
		else if (fileMimes.indexOf(fileInfo.mimetype) < 0){
			errObjs.push(makeErrorObj(fileInfo.filetype, 'invalidMime', fileMimes));
		}
		if (fileInfo.size === 0){
			errObjs.push(makeErrorObj(fileInfo.filetype, 'invalidSizeSmall', 0));
		}
		else {
			const fileSizeInMegabytes = fileInfo.size / 1000000.0;
			if (fileSizeInMegabytes > constraints.maxSize){
				errObjs.push(makeErrorObj(fileInfo.filetype, 'invalidSizeLarge', constraints.maxSize));
			}
		}
	}
	else if (constraints.requiredFile){
		errObjs.push(makeErrorObj(fileName, 'requiredFileMissing'));
	}

	return errObjs;
	
}

function getFieldValidationErrors(body, pathData, derefSchema){
	const processedFieldErrors = {
		errorArray:[]
	};
	const fieldErrors = validateBody(body, pathData);
	//If contactID
		//Ensure contact exists

		//If not, error
	if (fieldErrors.length > 0){
		processErrors(fieldErrors, processedFieldErrors, derefSchema);
	}

	return processedFieldErrors;
}

module.exports.removeInstance = removeInstance;
module.exports.combinePropArgument = combinePropArgument;
module.exports.makeErrorObj = makeErrorObj;
module.exports.getAllRequired = getAllRequired;
module.exports.findField = findField;
module.exports.handleMissingError = handleMissingError;
module.exports.handleTypeError = handleTypeError;
module.exports.handleFormatError = handleFormatError;
module.exports.handleEnumError = handleEnumError;
module.exports.getDependency = getDependency;
module.exports.handleDependencyError = handleDependencyError;
module.exports.handleAnyOfError = handleAnyOfError;
module.exports.getValidationSchema = getValidationSchema;
module.exports.validateBody = validateBody;
module.exports.processErrors = processErrors;
module.exports.makeFieldReadable = makeFieldReadable;
module.exports.makePathReadable = makePathReadable;
module.exports.buildFormatErrorMessage = buildFormatErrorMessage;
module.exports.makeAnyOfMessage = makeAnyOfMessage;
module.exports.concatErrors = concatErrors;
module.exports.generateFileErrors = generateFileErrors;
module.exports.generateErrorMesage = generateErrorMesage;
module.exports.checkForFilesInSchema = checkForFilesInSchema;
module.exports.getFileInfo = getFileInfo;
module.exports.validateFile = validateFile;
module.exports.getFieldValidationErrors = getFieldValidationErrors;
