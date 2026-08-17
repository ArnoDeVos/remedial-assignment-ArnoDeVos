/**
 * The neighbourhood map.
 */

import { useRef } from 'react';

import { colourForSubject, radiusForConfidence, zoneFillForIntensity } from '../utils/palette.js';

/**
 * Convert coordinate pairs to the points syntax used by SVG shapes.
 *
 * @param {Array<Array<number>>} points Coordinate pairs.
 * @returns {string} A space-separated "x,y" list.
 */
function toPointsAttribute(points) {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

/**
 * Renders the map.
 *
 * @param {object} props Component props.
 * @param {object} props.map Bounds, zones and streets from the API.
 * @param {Array<object>} [props.zoneActivity=[]] Per-zone intensities.
 * @param {Array<object>} [props.sightings=[]] Sightings to draw as markers.
 * @param {Array<object>} [props.trajectories=[]] Trajectories to draw as paths.
 * @param {string|null} [props.selectedSubjectId] Subject to emphasise.
 * @param {{x: number, y: number}|null} [props.pickedLocation] Marker for a
 *   location the resident is about to report.
 * @param {boolean} [props.isPicking=false] Whether clicking picks a location.
 * @param {(position: {x: number, y: number}) => void} [props.onPickLocation]
 *   Called with grid coordinates when the map is clicked in picking mode.
 * @param {(subjectId: string) => void} [props.onSelectSubject] Called when a
 *   marker is clicked.
 * @param {(sighting: object|null) => void} [props.onHoverSighting] Called as
 *   the pointer enters and leaves a marker.
 * @returns {JSX.Element} The map.
 */
export default function NeighbourhoodMap({
  map,
  zoneActivity = [],
  sightings = [],
  trajectories = [],
  selectedSubjectId = null,
  pickedLocation = null,
  isPicking = false,
  onPickLocation,
  onSelectSubject,
  onHoverSighting,
}) {
  const svgRef = useRef(null);

  const { bounds, zones, streets } = map;
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  const intensityByZone = new Map(
    zoneActivity.map((zone) => [zone.zoneCode, zone.intensity]),
  );

  /**
   * Translates a click into grid coordinates.
   *
   * @param {import('react').MouseEvent} event The click event.
   * @returns {void}
   */
  function handleClick(event) {
    if (!isPicking || !onPickLocation || !svgRef.current) {
      return;
    }

    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const transformed = point.matrixTransform(svg.getScreenCTM().inverse());

    onPickLocation({
      x: Math.round(Math.min(Math.max(transformed.x, bounds.minX), bounds.maxX)),
      y: Math.round(Math.min(Math.max(transformed.y, bounds.minY), bounds.maxY)),
    });
  }

  return (
    <svg
      ref={svgRef}
      className={`map${isPicking ? ' map--picking' : ''}`}
      viewBox={`${bounds.minX} ${bounds.minY} ${width} ${height}`}
      role="img"
      aria-label={`Map of ${map.name} showing ${sightings.length} sightings`}
      onClick={handleClick}
    >
      <defs>
        {/* One arrow marker per trajectory colour so the direction of travel
            matches the line it belongs to. */}
        {trajectories.map((trajectory) => (
          <marker
            key={`arrow-${trajectory.subjectId}`}
            id={`arrow-${trajectory.subjectId}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={colourForSubject(trajectory.subjectId)} />
          </marker>
        ))}
      </defs>

      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={width}
        height={height}
        className="map__backdrop"
      />

      {/* --- Zones, tinted by how much was reported in them ----------------- */}
      <g className="map__zones">
        {zones.map((zone) => (
          <g key={zone.code}>
            <polygon
              points={toPointsAttribute(zone.polygon)}
              fill={zoneFillForIntensity(intensityByZone.get(zone.code) ?? 0)}
              className="map__zone"
            >
              <title>{`${zone.name} — ${zone.description ?? ''}`}</title>
            </polygon>
            <text
              x={zone.polygon.reduce((total, [x]) => total + x, 0) / zone.polygon.length}
              y={zone.polygon.reduce((total, [, y]) => total + y, 0) / zone.polygon.length}
              className="map__zone-label"
              textAnchor="middle"
            >
              {zone.name}
            </text>
          </g>
        ))}
      </g>

      {/* --- Streets -------------------------------------------------------- */}
      <g className="map__streets">
        {streets.map((street) => (
          <polyline key={street.name} points={toPointsAttribute(street.path)} className="map__street">
            <title>{street.name}</title>
          </polyline>
        ))}
      </g>

      {/* --- Trajectories --------------------------------------------------- */}
      <g className="map__trajectories">
        {trajectories.map((trajectory) => {
          const colour = colourForSubject(trajectory.subjectId);
          const isSelected = trajectory.subjectId === selectedSubjectId;

          return (
            <g
              key={trajectory.subjectId}
              className={`map__trajectory${isSelected ? ' map__trajectory--selected' : ''}`}
            >
              {trajectory.segments
                .filter((segment) => !segment.startsNewLeg)
                .map((segment) => (
                  <line
                    key={`${segment.fromSightingId}-${segment.toSightingId}`}
                    x1={segment.from.x}
                    y1={segment.from.y}
                    x2={segment.to.x}
                    y2={segment.to.y}
                    stroke={colour}
                    strokeWidth={isSelected ? 3 : 1.75}
                    strokeDasharray={segment.isImplausible ? '6 6' : undefined}
                    opacity={segment.isImplausible ? 0.55 : 0.9}
                    markerEnd={`url(#arrow-${trajectory.subjectId})`}
                  >
                    <title>
                      {`${segment.metres} m in ${segment.seconds} s` +
                        (segment.speedKilometresPerHour === null
                          ? ''
                          : ` (${segment.speedKilometresPerHour} km/h)`) +
                        (segment.isImplausible ? ' — implausible' : '')}
                    </title>
                  </line>
                ))}
            </g>
          );
        })}
      </g>

      {/* --- Sighting markers ----------------------------------------------- */}
      <g className="map__sightings">
        {sightings.map((sighting) => {
          const isSelected = sighting.subjectId === selectedSubjectId;

          return (
            <circle
              key={sighting.id}
              cx={sighting.position.x}
              cy={sighting.position.y}
              r={radiusForConfidence(sighting.confidence)}
              fill={colourForSubject(sighting.subjectId)}
              className={
                `map__sighting${isSelected ? ' map__sighting--selected' : ''}` +
                `${sighting.status === 'needs_review' ? ' map__sighting--flagged' : ''}`
              }
              onClick={(event) => {
                event.stopPropagation();
                onSelectSubject?.(sighting.subjectId);
              }}
              onMouseEnter={() => onHoverSighting?.(sighting)}
              onMouseLeave={() => onHoverSighting?.(null)}
            >
              <title>
                {`${sighting.subjectLabel ?? 'Unknown'} — reported by ${sighting.reporterName}`}
              </title>
            </circle>
          );
        })}
      </g>

      {/* --- The spot the resident is about to report ----------------------- */}
      {pickedLocation ? (
        <g className="map__picked" pointerEvents="none">
          <circle cx={pickedLocation.x} cy={pickedLocation.y} r="12" />
          <line
            x1={pickedLocation.x - 18}
            y1={pickedLocation.y}
            x2={pickedLocation.x + 18}
            y2={pickedLocation.y}
          />
          <line
            x1={pickedLocation.x}
            y1={pickedLocation.y - 18}
            x2={pickedLocation.x}
            y2={pickedLocation.y + 18}
          />
        </g>
      ) : null}
    </svg>
  );
}
