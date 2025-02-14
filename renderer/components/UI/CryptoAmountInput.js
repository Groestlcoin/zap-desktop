import React from 'react'
import PropTypes from 'prop-types'
import { compose } from 'redux'
import { asField } from 'informed'
import { withNumberInputMask, withNumberValidation } from 'hocs'
import { convert } from '@zap/utils/btc'
import { formatValue, parseNumber } from '@zap/utils/crypto'
import { BasicInput } from './Input'

class CryptoAmountInput extends React.Component {
  static propTypes = {
    cryptoUnit: PropTypes.string.isRequired,
    fieldApi: PropTypes.object.isRequired,
    fieldState: PropTypes.object.isRequired,
    isRequired: PropTypes.bool,
    onBlur: PropTypes.func,
    onChange: PropTypes.func,
  }

  componentDidUpdate(prevProps) {
    const { cryptoUnit, fieldApi, fieldState } = this.props
    // Reformat the value when the currency unit has changed.
    if (cryptoUnit !== prevProps.cryptoUnit) {
      const { fieldApi } = this.props
      let { value } = fieldState
      const convertedValue = convert(prevProps.cryptoUnit, cryptoUnit, value)
      const [integer, fractional] = parseNumber(convertedValue, this.getRules().precision)
      value = formatValue(integer, fractional)
      fieldApi.setValue(value)
    }

    // If the value has changed, reformat it if needed.
    const valueBefore = prevProps.fieldState.value
    const valueAfter = fieldState.value
    if (valueAfter !== valueBefore) {
      const [integer, fractional] = parseNumber(valueAfter, this.getRules().precision)
      // Handle a corner case for the satoshis. sat number must be integer so
      // explicitly getting rid of fractional part (to avoid things like "1000." )
      const isSats = ['sats', 'lits'].includes(cryptoUnit)
      const formattedValue = formatValue(integer, isSats ? null : fractional)
      if (formattedValue !== valueAfter) {
        fieldApi.setValue(formattedValue)
      }
    }
  }

  getRules = () => {
    const { cryptoUnit } = this.props
    switch (cryptoUnit) {
      case 'btc':
      case 'ltc':
      case 'grs':
        return {
          precision: 8,
          step: '0.00000001',
          placeholder: '0.00000000',
          pattern: '[0-9]*.?[0-9]{0,8}?',
        }
      case 'bits':
      case 'phots':
      case 'groestls':
        return {
          precision: 2,
          step: '0.01',
          placeholder: '0.00',
          pattern: '[0-9]*.?[0-9]{0,2}?',
        }
      case 'sats':
      case 'lits':
      case 'gros':
        return {
          precision: 0,
          step: '1',
          placeholder: '00000000',
          pattern: '[0-9]*',
        }
      default:
        return {
          precision: 2,
          pattern: '[0-9]*',
        }
    }
  }

  render() {
    const rules = this.getRules()

    return (
      <BasicInput
        {...this.props}
        pattern={rules.pattern}
        placeholder={rules.placeholder}
        step={rules.step}
        type="number"
      />
    )
  }
}

const CryptoAmountInputAsField = compose(
  withNumberValidation,
  asField,
  withNumberInputMask
)(CryptoAmountInput)

// Wrap the select field to apply conditional validation.
const WrappedCryptoAmountInputAsField = props => {
  const { isRequired } = props

  return <CryptoAmountInputAsField moreThan={isRequired ? 0 : null} {...props} />
}

WrappedCryptoAmountInputAsField.propTypes = {
  isRequired: PropTypes.bool,
}

export default WrappedCryptoAmountInputAsField
