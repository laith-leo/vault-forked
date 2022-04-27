/**
 * @module SecretEditMetadata
 *
 * @example
 * ```js
 * <SecretEditMetadata
 * @model={{model}}
 * @mode={{mode}}
 * @updateValidationErrorCount={{updateValidationErrorCount}}
 * />
 * ```
 *
 * @param {object} model - name of the current cluster, passed from the parent.
 * @param {string} mode - if the mode is create, show, edit.
 * @param {Function} [updateValidationErrorCount] - function on parent that handles disabling the save button.
 */

import Component from '@glimmer/component';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class SecretEditMetadata extends Component {
  @service router;
  @service store;

  @tracked validationErrorCount = 0;

  constructor() {
    super(...arguments);
    this.validationMessages = {
      customMetadata: '',
      maxVersions: '',
    };
  }

  async save() {
    let model = this.args.model;
    try {
      await model.save();
    } catch (e) {
      this.error = e;
      return;
    }
    this.router.transitionTo('vault.cluster.secrets.backend.metadata', this.args.model.id);
  }

  @action
  onSaveChanges(event) {
    event.preventDefault();
    return this.save();
  }
  @action onKeyUp(name, value) {
    if (value) {
      if (name === 'customMetadata') {
        // cp validations won't work on an object so performing validations here
        // JLR TODO: review this and incorporate into model-validations system
        /* eslint-disable no-useless-escape */
        let regex = /^[^\\]+$/g; // looking for a backward slash
        value.match(regex)
          ? set(this.validationMessages, name, '')
          : set(this.validationMessages, name, 'Custom values cannot contain a backward slash.');
      }
      if (name === 'maxVersions') {
        this.args.model.maxVersions = value;
        const {
          state: { maxVersions },
        } = this.args.model.validate();
        maxVersions.isValid
          ? set(this.validationMessages, name, '')
          : set(this.validationMessages, name, maxVersions.errors.join('. '));
      }
    }

    let values = Object.values(this.validationMessages);
    this.validationErrorCount = values.filter(Boolean).length;
    // when mode is "update" this works, but on mode "create" we need to bubble up the count
    if (this.args.updateValidationErrorCount) {
      this.args.updateValidationErrorCount(this.validationErrorCount);
    }
  }
}
