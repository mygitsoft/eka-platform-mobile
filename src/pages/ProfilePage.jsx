const formatValue = (value) => value || 'Not provided';

const getPatientName = (patient) => patient.fullName
  || [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
  || 'Patient';

const getAddressText = (address) => [
  address.addressLine1,
  address.addressLine2,
  address.landmark,
  address.city,
  address.district,
  address.state,
  address.country,
  address.pincode,
].filter(Boolean).join(', ');

const getContactText = (contact) => [
  [contact.countryCode, contact.contactNumber].filter(Boolean).join(' '),
  contact.emailAddress,
].filter(Boolean).join(' · ');

const getEmergencyContactText = (contact) => [
  [contact.contactName, contact.relationship].filter(Boolean).join(' · '),
  [contact.countryCode, contact.mobileNumber].filter(Boolean).join(' '),
  contact.alternateNumber,
  contact.email,
].filter(Boolean).join(' · ');

function ProfilePage({ patients, loading, error }) {
  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <p className="eyebrow">Assigned hospital</p>
      <h1 id="profile-title">Patient profiles</h1>
      {loading ? (
        <p>Loading patient details…</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : patients.length === 0 ? (
        <p className="empty-card">No patient records are available for this hospital.</p>
      ) : (
        <div className="profile-patient-list">
          {patients.map((patient) => {
            const addresses = patient.addresses || [];
            const contacts = patient.contacts || [];
            const emergencyContacts = patient.emergencyContacts || [];

            return (
              <article className="profile-card" key={patient.id}>
                <h2>{getPatientName(patient)}</h2>
                {patient.uhid ? <p className="profile-uhid">UHID: {patient.uhid}</p> : null}
                <dl className="profile-details">
                  <div>
                    <dt>Address</dt>
                    <dd>
                      {addresses.length
                        ? addresses.map(getAddressText).filter(Boolean).join(' | ') || 'Not provided'
                        : formatValue(patient.address)}
                    </dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>
                      {contacts.length
                        ? contacts.map(getContactText).filter(Boolean).join(' | ') || 'Not provided'
                        : formatValue(patient.contactNumber)}
                    </dd>
                  </div>
                  <div>
                    <dt>Emergency contact</dt>
                    <dd>
                      {emergencyContacts.length
                        ? emergencyContacts.map(getEmergencyContactText).filter(Boolean).join(' | ') || 'Not provided'
                        : formatValue(patient.emergencyContact)}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ProfilePage;
