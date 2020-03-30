import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as utils from '../utils';

class BalanceOutput extends Component {
  render() {
    if (!this.props.userInput.format) {
      return null;
    }

    return (
      <div className='output'>
        <p>
          Total Debit: {this.props.totalDebit} Total Credit: {this.props.totalCredit}
          <br />
          Balance from account {this.props.userInput.startAccount || '*'}
          {' '}
          to {this.props.userInput.endAccount || '*'}
          {' '}
          from period {utils.dateToString(this.props.userInput.startPeriod)}
          {' '}
          to {utils.dateToString(this.props.userInput.endPeriod)}
        </p>
        {this.props.userInput.format === 'CSV' ? (
          <pre>{utils.toCSV(this.props.balance)}</pre>
        ) : null}
        {this.props.entries}
        {this.props.userInput.format === 'HTML' ? (
          <table className="table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {this.props.balance.map((entry, i) => (
                <tr key={i}>
                  <th scope="row">{entry.ACCOUNT}</th>
                  <td>{entry.DESCRIPTION}</td>
                  <td>{entry.DEBIT}</td>
                  <td>{entry.CREDIT}</td>
                  <td>{entry.BALANCE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    );
  }
}

BalanceOutput.propTypes = {
  balance: PropTypes.arrayOf(
    PropTypes.shape({
      ACCOUNT: PropTypes.number.isRequired,
      DESCRIPTION: PropTypes.string.isRequired,
      DEBIT: PropTypes.number.isRequired,
      CREDIT: PropTypes.number.isRequired,
      BALANCE: PropTypes.number.isRequired
    })
  ).isRequired,
  totalCredit: PropTypes.number.isRequired,
  totalDebit: PropTypes.number.isRequired,
  userInput: PropTypes.shape({
    startAccount: PropTypes.number,
    endAccount: PropTypes.number,
    startPeriod: PropTypes.date,
    endPeriod: PropTypes.date,
    format: PropTypes.string
  }).isRequired
};

/**
 * Filter by Range
 * @param {number} start period
 * @param {number} end period
 * @param {number} target user input
 * @returns {boolean}
 */
function filterByRange(start, end, target) {
  if (isNaN(start) && isNaN(end)) return true;
  if (isNaN(start)) return target <= end;
  if (isNaN(end)) return target >= start;

  return target >= start && target <= end;
}

export default connect(({ accounts, userInput, journalEntries }) => {
  const hashAccounts = {};

  for (let account of accounts) {
    hashAccounts[account.ACCOUNT] = account.LABEL; 
  }

  const balance = journalEntries.filter(e => (
    filterByRange(userInput.startAccount, userInput.endAccount, e.ACCOUNT) &&
    filterByRange(userInput.startPeriod, userInput.endPeriod, e.PERIOD)
  )).map(e => ({
    ...e,
    DESCRIPTION: hashAccounts[e.ACCOUNT],
    BALANCE: e.DEBIT - e.CREDIT,
  })).sort((a, b) => a.ACCOUNT - b.ACCOUNT);
  
  const balanceGroupedObject = balance.reduce((acum, current) => {
    if (acum[current.ACCOUNT]) {
      acum[current.ACCOUNT] = {
        ...current,
        DEBIT: acum[current.ACCOUNT].DEBIT + current.DEBIT,
        CREDIT: acum[current.ACCOUNT].CREDIT + current.CREDIT,
        BALANCE: acum[current.ACCOUNT].BALANCE + current.BALANCE,
      }
    } else {
      acum[current.ACCOUNT] = {
        ...current,
      }
    }
    return acum;
  }, {});

  const balanceGrouped = Object.keys(balanceGroupedObject).map(key => ({ ...balanceGroupedObject[key] }));
  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);

  return {
    balance: balanceGrouped,
    totalCredit,
    totalDebit,
    userInput: userInput,
    entries: balance.length,
  };
})(BalanceOutput);
