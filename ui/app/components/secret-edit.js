/* eslint ember/no-computed-properties-in-native-classes: 'warn' */
/**
 * @module SecretEdit
 * SecretEdit component manages the secret and model data, and displays either the create, update, empty state or show view of a KV secret.
 *
 * @example
 * ```js
 * <SecretEdit @model={{model}} @mode="create" @baseKey={{this.baseKey}} @key={{this.model}} @initialKey={{this.initialKey}} @onRefresh={{action "refresh"}} @onToggleAdvancedEdit={{action "toggleAdvancedEdit"}} @preferAdvancedEdit={{this.preferAdvancedEdit}}/>
 * ```
/This component is initialized from the secret-edit-layout.hbs file
 * @param {object} model - Model returned from secret-v2 which is generated in the secret-edit route
 * @param {string} mode - Edit, create, etc.
 * @param {string} baseKey - Provided for navigation.
 * @param {object} key - Passed through, copy of the model.
 * @param {string} initialKey - model's name.
 * @param {function} onRefresh - action that refreshes the model
 * @param {function} onToggleAdvancedEdit - changes the preferAdvancedEdit to true or false
 * @param {boolean} preferAdvancedEdit - property set from the controller of show/edit/create route passed in through secret-edit-layout
 */

import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import KVObject from 'vault/lib/kv-object';
import { maybeQueryRecord } from 'vault/macros/maybe-query-record';
import { alias, or } from '@ember/object/computed';

export default class SecretEdit extends Component {
  @service wizard;
  @service store;

  @tracked secretData = null;
  @tracked isV2 = false;
  @tracked codemirrorString = null;

  constructor() {
    super(...arguments);
    let secrets = this.args.model.secretData;
    if (!secrets && this.args.model.selectedVersion) {
      this.isV2 = true;
      secrets = this.args.model.belongsTo('selectedVersion').value().secretData;
    }
    const data = KVObject.create({ content: [] }).fromJSON(secrets);
    this.secretData = data;
    this.codemirrorString = data.toJSONString();
    if (this.wizard.featureState === 'details' && this.args.mode === 'create') {
      let engine = this.args.model.backend.includes('kv') ? 'kv' : this.args.model.backend;
      this.wizard.transitionFeatureMachine('details', 'CONTINUE', engine);
    }
  }

  @maybeQueryRecord(
    'capabilities',
    (context) => {
      if (!context.args.model || context.args.mode === 'create') {
        return;
      }
      let backend = context.isV2 ? context.args.model.engine.id : context.args.model.backend;
      let id = context.args.model.id;
      let path = context.isV2 ? `${backend}/data/${id}` : `${backend}/${id}`;
      return {
        id: path,
      };
    },
    'isV2',
    'model',
    'model.id',
    'mode'
  )
  checkSecretCapabilities;
  @alias('checkSecretCapabilities.canUpdate') canUpdateSecretData;
  @alias('checkSecretCapabilities.canRead') canReadSecretData;

  @maybeQueryRecord(
    'capabilities',
    (context) => {
      if (!context.args.model || !context.isV2) {
        return;
      }
      let backend = context.args.model.backend;
      let path = `${backend}/metadata/`;
      return {
        id: path,
      };
    },
    'isV2',
    'model',
    'model.id',
    'mode'
  )
  checkMetadataCapabilities;
  @alias('checkMetadataCapabilities.canDelete') canDeleteSecretMetadata;
  @alias('checkMetadataCapabilities.canUpdate') canUpdateSecretMetadata;
  @alias('checkMetadataCapabilities.canRead') canReadSecretMetadata;

  @or('model.isLoading', 'model.isReloading', 'model.isSaving') requestInFlight;
  @or('requestInFlight', 'model.isFolder', 'model.flagsIsInvalid') buttonDisabled;

  get modelForData() {
    let { model } = this.args;
    if (!model) return null;
    return this.isV2 ? model.belongsTo('selectedVersion').value() : model;
  }

  get basicModeDisabled() {
    return this.secretDataIsAdvanced || this.showAdvancedMode === false;
  }

  get secretDataAsJSON() {
    return this.secretData.toJSON();
  }

  get secretDataIsAdvanced() {
    return this.secretData.isAdvanced();
  }

  get showAdvancedMode() {
    return this.secretDataIsAdvanced || this.args.preferAdvancedEdit;
  }

  get isWriteWithoutRead() {
    if (!this.args.model) {
      return false;
    }
    // if the version couldn't be read from the server
    if (this.isV2 && this.modelForData.failedServerRead) {
      return true;
    }
    // if the model couldn't be read from the server
    if (!this.isV2 && this.args.model.failedServerRead) {
      return true;
    }
    return false;
  }

  @action
  refresh() {
    this.args.onRefresh();
  }

  @action
  toggleAdvanced(bool) {
    this.args.onToggleAdvancedEdit(bool);
  }
}
