export default function HotlineBar() {
  return (
    <div className="hotline-bar">
      <div className="container">
        <div className="hotline-inner">
          <div className="hotline-items">
            <a href="tel:911" className="hotline-item">
              <span>National emergency: 911</span>
            </a>
            <a href="https://ehotlines.e.gov.ph/" className="hotline-item">
              <span>Official emergency directory</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
